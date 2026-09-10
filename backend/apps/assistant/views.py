from django.db.models import Max
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsManagerOrAdmin

from .engine import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, answer_question
from .models import FaqEntry
from .serializers import FaqEntrySerializer

MAX_QUESTION_LEN = 1000
# How much prior conversation the LLM sees. Kept deliberately tight: prefill
# dominates latency on the no-GPU box (~9.4 tok/s), so every char of history is
# paid for in the employee's wait — the same reason ASSISTANT_RAG_MAX_CONTEXT is 2.
# Two turns is the last exchange (their question + our answer), which is what a
# follow-up almost always refers back to; more would regress the latency budget.
MAX_HISTORY_TURNS = 2
MAX_HISTORY_CHARS = 400


def _clean_history(raw) -> list[dict]:
    """Sanitise the client-supplied conversation history into the last few
    well-formed {role, content} turns. Anything malformed is dropped rather than
    trusted — the transcript is user input like the question itself."""
    if not isinstance(raw, list):
        return []
    turns = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = item.get('role')
        content = item.get('content') or item.get('text') or ''
        if role in ('user', 'assistant') and isinstance(content, str) and content.strip():
            turns.append({'role': role, 'content': content.strip()[:MAX_HISTORY_CHARS]})
    return turns[-MAX_HISTORY_TURNS:]


def _resolve_language(request) -> str:
    lang = (request.query_params.get('lang') or '').strip().lower()
    if lang in SUPPORTED_LANGUAGES:
        return lang
    header = (request.headers.get('Accept-Language') or '').strip().lower()
    if header:
        primary = header.split(',')[0].split(';')[0].strip()[:2]
        if primary in SUPPORTED_LANGUAGES:
            return primary
    profile = (getattr(request.user, 'language', '') or '').lower()
    if profile in SUPPORTED_LANGUAGES:
        return profile
    return DEFAULT_LANGUAGE


class FaqListView(ListAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = FaqEntrySerializer
    pagination_class = None

    def get_queryset(self):
        language = _resolve_language(self.request)
        qs = FaqEntry.objects.filter(is_published=True)
        localized = qs.filter(language=language)
        if language != DEFAULT_LANGUAGE and not localized.exists():
            return qs.filter(language=DEFAULT_LANGUAGE)
        return localized


class AssistantAskView(APIView):

    permission_classes = [IsAuthenticated]
    throttle_scope = 'assistant'

    def post(self, request):
        question = (request.data.get('question') or '').strip()
        if not question:
            raise ValidationError({'question': 'Question is required.'})
        if len(question) > MAX_QUESTION_LEN:
            raise ValidationError({'question': 'Question is too long.'})
        history = _clean_history(request.data.get('history'))
        return Response(
            answer_question(request.user, question, _resolve_language(request), history=history)
        )


class AdminFaqViewSet(viewsets.ModelViewSet):

    permission_classes = [IsManagerOrAdmin]
    serializer_class = FaqEntrySerializer
    queryset = FaqEntry.objects.all()
    pagination_class = None

    def perform_create(self, serializer):
        if not serializer.validated_data.get('order'):
            language = serializer.validated_data.get('language') or 'fr'
            last = FaqEntry.objects.filter(language=language).aggregate(m=Max('order'))['m'] or 0
            serializer.save(order=last + 1)
        else:
            serializer.save()
