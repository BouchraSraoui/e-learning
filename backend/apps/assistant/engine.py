import logging
import re
import unicodedata

from . import rag
from .clients import AssistantBackendError
from .models import FaqEntry, Language

logger = logging.getLogger(__name__)

DEFAULT_LANGUAGE = Language.FR
SUPPORTED_LANGUAGES = {choice.value for choice in Language}

FALLBACK_ANSWERS = {
    'fr': (
        'Je n’ai pas trouvé de réponse précise à votre question dans la FAQ. '
        'Essayez de la reformuler, choisissez l’une des suggestions ci-dessous, ou '
        'contactez le support Icosnet pour une aide personnalisée.'
    ),
    'en': (
        'I couldn’t find a precise answer to your question in the FAQ. '
        'Try rephrasing it, pick one of the suggestions below, or contact '
        'Icosnet support for personalised help.'
    ),
}

STOPWORDS = {
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'au', 'aux',
    'en', 'je', 'tu', 'il', 'on', 'mon', 'ma', 'mes', 'ton', 'ta', 'ses',
    'comment', 'est', 'que', 'qui', 'quoi', 'pour', 'sur', 'dans', 'avec', 'par',
    'pas', 'the', 'and', 'for', 'you', 'your', 'how', 'can', 'what', 'where',
    'why', 'are', 'this', 'that',
}

# Marks a message as a how-to / action request rather than a personal-status
# question ("how many … do I have?"). It gates the offline personal router off, so
# "download my certificate" reaches the how-to FAQ instead of being answered with the
# user's certificate count. Action verbs are accent-stripped to match `_flatten`.
_HOWTO_RE = re.compile(
    r'( comment | puis | peut | pourquoi | quand | how to | how do i | how can i '
    r'| download | telecharger | verify | verifier )'
)
_PERSONAL_RE = re.compile(
    r'( mes | mon | ma | jai | ai | combien | my | mine | how many | do i have )'
)

# Small talk: a pure greeting / thanks with no real question. Answered warmly so
# "bonjour"/"hello" doesn't fall through to the not-found fallback. It fires ONLY
# when EVERY token is a trigger/filler — a greeting glued to a real question (e.g.
# "salut, comment obtenir un certificat ?") still routes to the normal pipeline.
_GREETING_TRIGGERS = {
    'bonjour', 'bonsoir', 'salut', 'coucou', 'cc', 'allo', 'alo', 'slt', 'hello',
    'helo', 'hi', 'hey', 'hiya', 'yo', 'hola', 'holla', 'wesh', 'salam', 'salamou', 're',
}
_THANKS_TRIGGERS = {'merci', 'mercii', 'merciii', 'thanks', 'thank', 'thankyou', 'thx', 'ty', 'thks'}
# Non-trigger words allowed to sit next to a trigger without disqualifying small talk.
_SMALLTALK_FILLERS = {
    'ca', 'va', 'vas', 'allez', 'allezvous', 'toi', 'vous', 'neuf', 'doing', 'today',
    'there', 'up', 'whats', 'sup', 'wassup', 'everyone', 'all', 'team', 'bonne',
    'journee', 'matin', 'soir', 'soiree', 'good', 'morning', 'evening', 'afternoon',
    'day', 'nice', 'meet', 'going', 'well', 'ok', 'okay', 'much', 'lot',
    'beaucoup', 'bcp', 'vraiment', 'tres', 'mille', 'infiniment', 'really', 'so',
}
_GREETING_PHRASES = ('ca va', 'how are you', 'how are u', 'how r u', 'whats up',
                     'quoi de neuf', 'how is it going', 'nice to meet')

_GREETING_BODIES = {
    'fr': (
        ' Je suis l’assistant de la Bibliothèque de formation Icosnet. '
        'Je peux vous aider sur les cours, l’inscription, la progression, les certificats, '
        'les badges et le chat. Posez-moi votre question, ou choisissez une suggestion ci-dessous.'
    ),
    'en': (
        ' I’m the Icosnet Training Library assistant. I can help with courses, '
        'enrolment, progress, certificates, badges and chat. Ask me your question, or '
        'pick one of the suggestions below.'
    ),
}
_THANKS_ANSWERS = {
    'fr': 'Avec plaisir ! N’hésitez pas si vous avez d’autres questions sur la plateforme de formation.',
    'en': 'You’re welcome! Feel free to ask if you have any other questions about the training platform.',
}


def _normalize(text: str) -> str:
    lowered = (text or '').lower()
    decomposed = unicodedata.normalize('NFD', lowered)
    return ''.join(ch for ch in decomposed if unicodedata.category(ch) != 'Mn')


def _tokenize(text: str) -> list[str]:
    return [
        t for t in re.split(r'[^a-z0-9]+', _normalize(text))
        if len(t) > 2 and t not in STOPWORDS
    ]


def _flatten(text: str) -> str:
    flat = re.sub(r'[^a-z0-9]+', ' ', _normalize(text)).strip()
    return f' {flat} '


def _score_faq(query_tokens: list[str], faq: FaqEntry) -> int:
    # Curated keywords are the authoritative topic signal. Words that appear only in
    # the question text are incidental — the generic verb "change"/"changer", for
    # instance, is shared by many entries — so on their own they must not win a match.
    # Scoring a keyword hit (3) far above a bare question-word hit (1) is what stops
    # "how do I change my name" from landing on the "change the interface language" FAQ:
    # a single keyword clears the threshold, a lone shared verb does not.
    keyword_tokens = set(_tokenize(' '.join(faq.keywords or [])))
    question_tokens = set(_tokenize(faq.question)) - keyword_tokens
    score = 0
    for token in query_tokens:
        if token in keyword_tokens:
            score += 3
        elif token in question_tokens:
            score += 1
        else:
            for hay in keyword_tokens:
                if len(hay) > 3 and (token in hay or hay in token):
                    score += 1
                    break
    return score


def _published(language: str) -> list[FaqEntry]:
    qs = FaqEntry.objects.filter(is_published=True)
    rows = list(qs.filter(language=language).order_by('order', 'id'))
    if not rows and language != DEFAULT_LANGUAGE:
        rows = list(qs.filter(language=DEFAULT_LANGUAGE).order_by('order', 'id'))
    return rows


def _best_match(query_tokens: list[str], corpus: list[FaqEntry]):
    scored = [(f, _score_faq(query_tokens, f)) for f in corpus]
    scored = [pair for pair in scored if pair[1] > 0]
    scored.sort(key=lambda pair: (-pair[1], pair[0].order, pair[0].id))
    if scored and scored[0][1] >= 2:
        return scored[0][0], [f for f, _ in scored[1:4]]
    return None, []


def _suggestion_questions(published, limit=3) -> list[str]:
    return [f.question for f in published[:limit]]


def _personal_reply(user, raw_question: str, query_tokens: list[str], published, language: str):
    flat = _flatten(raw_question)
    if _HOWTO_RE.search(flat) or not _PERSONAL_RE.search(flat):
        return None

    from apps.courses.models import Course
    from apps.progress.models import Certificate, Enrollment, EnrollmentStatus

    en = language == 'en'
    suggestions = _suggestion_questions(published)

    def has(*words: str) -> bool:
        return any(w in query_tokens for w in words)

    if has('certificat', 'certificats', 'certificate', 'certificates', 'attestation'):
        certs = list(Certificate.objects.filter(user=user))
        if certs:
            n = len(certs)
            titles = ', '.join(c.course_title for c in certs)
            plural = 's' if n > 1 else ''
            answer = (
                f'You have earned {n} certificate{plural}: {titles}. Open “Certificates” '
                'to download them or share their verification link.'
            ) if en else (
                f'Vous avez obtenu {n} certificat{plural} : {titles}. Ouvrez '
                '« Certificats » pour les télécharger ou partager leur lien de vérification.'
            )
        else:
            answer = (
                'You don’t have any certificates yet. Complete a course and pass its '
                'quiz to earn one automatically.'
            ) if en else (
                'Vous n’avez pas encore de certificat. Terminez un cours et réussissez '
                'son quiz pour en obtenir un automatiquement.'
            )
        return {'answer': answer, 'intent': 'personal', 'sources': [], 'suggestions': suggestions}

    if has('badge', 'badges', 'point', 'points'):
        total = user.points + user.badge_points
        plural = 's' if total > 1 else ''
        answer = (
            f'You have a total of {total} point{plural}. Check “Badges” to see the ones '
            'you have unlocked and “Leaderboard” for your position.'
        ) if en else (
            f'Vous totalisez {total} point{plural}. Consultez « Badges » pour voir ceux '
            'que vous avez débloqués et « Classement » pour votre position.'
        )
        return {'answer': answer, 'intent': 'personal', 'sources': [], 'suggestions': suggestions}

    if has('progression', 'progres', 'progress', 'cours', 'formation', 'formations',
           'courses', 'apprends', 'suis', 'course', 'learning'):
        completed_ids = set(
            Enrollment.objects.filter(user=user, status=EnrollmentStatus.COMPLETED)
            .values_list('course_id', flat=True)
        )
        mandatory_ids = Course.objects.filter(
            is_published=True, is_mandatory=True
        ).values_list('id', flat=True)
        remaining = sum(1 for cid in mandatory_ids if cid not in completed_ids)
        plural = 's' if remaining > 1 else ''
        if en:
            tail = (
                f'You still have {remaining} mandatory course{plural} to complete.'
                if remaining > 0
                else 'You are up to date on your mandatory courses. Well done!'
            )
            answer = (
                f'You are currently taking {user.courses_in_progress} course(s) and have '
                f'completed {user.courses_completed}. {tail} See the details in “My learning”.'
            )
        else:
            tail = (
                f'Il vous reste {remaining} cours obligatoire{plural} à compléter.'
                if remaining > 0
                else 'Vous êtes à jour sur vos cours obligatoires. Bravo !'
            )
            answer = (
                f'Vous suivez actuellement {user.courses_in_progress} cours en cours et en avez '
                f'terminé {user.courses_completed}. {tail} Retrouvez le détail dans « Mes formations ».'
            )
        return {'answer': answer, 'intent': 'personal', 'sources': [], 'suggestions': suggestions}

    return None


def _greeting_answer(user, language: str) -> str:
    first = (getattr(user, 'first_name', '') or '').strip()
    if language == 'en':
        opener = f'Hi {first}!' if first else 'Hi there!'
    else:
        opener = f'Bonjour {first} !' if first else 'Bonjour !'
    return opener + _GREETING_BODIES.get(language, _GREETING_BODIES['fr'])


def _smalltalk_reply(raw_question: str, language: str, suggestions: list[str], user=None):
    flat = _flatten(raw_question)
    tokens = [t for t in re.split(r'[^a-z0-9]+', flat) if t]
    if not tokens:
        return None

    has_greeting = (any(t in _GREETING_TRIGGERS for t in tokens)
                    or any(phrase in flat for phrase in _GREETING_PHRASES))
    has_thanks = any(t in _THANKS_TRIGGERS for t in tokens)
    if not (has_greeting or has_thanks):
        return None

    # A single substantive token (not a greeting/filler/stopword, longer than 2
    # chars) means there's a real question in there — let the pipeline handle it.
    allowed = _GREETING_TRIGGERS | _THANKS_TRIGGERS | _SMALLTALK_FILLERS | STOPWORDS
    if not all(t in allowed or len(t) <= 2 for t in tokens):
        return None

    if has_thanks and not has_greeting:
        answer = _THANKS_ANSWERS.get(language, _THANKS_ANSWERS['fr'])
    else:
        answer = _greeting_answer(user, language)
    return {
        'answer': answer,
        'intent': 'greeting',
        'sources': [],
        'suggestions': suggestions,
    }


def _offline_answer(user, question: str, language: str) -> dict:
    """Used only when the LLM backend is down or the RAG index isn't built:
    DB-templated personal answer, keyword FAQ match, then guided fallback.
    (Greetings never get here — `answer_question` fast-paths them first.)"""
    query_tokens = _tokenize(question)
    published = _published(language)
    top_questions = _suggestion_questions(published)

    personal = _personal_reply(user, question, query_tokens, published, language)
    if personal:
        return personal

    best, runners_up = _best_match(query_tokens, published)
    if best is None:
        in_corpus = {f.id for f in published}
        others = [
            f for f in FaqEntry.objects.filter(is_published=True).order_by('order', 'id')
            if f.id not in in_corpus
        ]
        best, runners_up = _best_match(query_tokens, others)

    if best is not None:
        suggestions = [f.question for f in runners_up]
        if not suggestions:
            suggestions = [q for q in top_questions if q != best.question]
        return {
            'answer': best.answer,
            'intent': 'faq',
            'sources': [{'id': best.id, 'question': best.question}],
            'suggestions': suggestions,
        }

    return {
        'answer': FALLBACK_ANSWERS.get(language, FALLBACK_ANSWERS['fr']),
        'intent': 'fallback',
        'sources': [],
        'suggestions': top_questions,
    }


def answer_question(user, question: str, language: str = DEFAULT_LANGUAGE,
                    history=None) -> dict:
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE

    suggestions = _suggestion_questions(_published(language))

    # Fast path: a pure greeting or thanks is answered instantly, before any model
    # call. There is nothing to ground and nothing to retrieve, but routing it
    # through embed + generation cost ~45-75s on this no-GPU box — the client's
    # "slow even for « Bonjour »" remark (round 2, 19 Jul 2026). A greeting glued to
    # a real question is NOT small talk and still goes to the LLM (see
    # `_smalltalk_reply`), so this buys latency without costing an answer.
    smalltalk = _smalltalk_reply(question, language, suggestions, user=user)
    if smalltalk:
        return smalltalk

    # Everything else — chit-chat, personal status, grounded questions — is answered
    # conversationally by the LLM over retrieved docs + the user's own stats (see
    # rag.answer). The offline keyword engine kicks in only when the LLM backend is
    # down or the RAG index isn't built.
    try:
        reply = rag.answer(user, question, language, history=history)
    except AssistantBackendError as exc:
        logger.warning('assistant LLM unavailable, using offline engine: %s', exc)
        reply = None
    if reply is not None:
        reply.setdefault('suggestions', suggestions)
        return reply

    # RAG was unavailable — the assistant is disabled, the index isn't built, or the
    # LLM backend errored (AssistantBackendError above). The offline keyword engine is
    # answering, so flag the reply as degraded: the UI surfaces an "offline mode" notice
    # instead of silently passing keyword-FAQ output off as the full AI assistant.
    reply = _offline_answer(user, question, language)
    reply['offline'] = True
    return reply
