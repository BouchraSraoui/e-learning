"""The assistant's LLM answers every message conversationally, grounding on
retrieved docs + the user's own stats when relevant.

`answer()` returns None only when RAG is structurally unavailable (disabled or
empty index) so the caller can use the offline keyword/greeting engine; a
backend outage raises AssistantBackendError for the same degradation path.
Greetings, chit-chat and questions all flow through here — the LLM decides how
to reply, using the context when it helps and answering plainly when it doesn't.
"""

import logging
import time

from django.conf import settings

from .clients import get_embedding_client, get_llm_client
from .models import KnowledgeChunk
from .retrieval import audiences_for, retrieve

logger = logging.getLogger(__name__)

MAX_SOURCES = 3
# Include a chunk in the prompt only when it's at least loosely relevant, so a
# greeting/off-topic message isn't padded with irrelevant docs (keeps it faster).
CONTEXT_FLOOR = 0.40

# Kept dense: prefill runs at ~9 tokens/s on the no-GPU box, so every 100 tokens of
# system prompt costs the employee ~10s of waiting. The greeting instructions that
# used to live here are gone — greetings never reach the LLM now
# (engine.answer_question fast-paths them).
#
# The direct-address / never-guess-gender framing below is load-bearing, not padding.
# Without it the model narrates the user in the THIRD PERSON and guesses their gender
# from their name ("Sofia" -> "she can access all features"), and it treats the
# injected account block as a third party's data it declines to relay ("give me my
# account info" -> "there is no need... already available for Sofia Mansouri"). Telling
# it plainly that it is speaking TO that person, and that the block is an answerable
# source, fixes both — worth its ~40 tokens.
SYSTEM_PROMPTS = {
    'fr': (
        "Tu es l'assistant de la Bibliothèque de formation Icosnet, la plateforme de "
        "formation interne pour les apprenants, les managers et les administrateurs. "
        "Tu t'adresses directement à la personne décrite dans les informations "
        "ci-dessous : emploie toujours le vouvoiement, ne parle jamais de cette personne "
        "à la troisième personne et ne devine jamais son genre — reste neutre (garde le "
        "libellé du rôle tel quel, emploie des tournures comme « votre compte », évite "
        "tout accord genré comme « inscrit(e) » ou « administratrice »). Ces informations "
        "sont une source valide : sers-t'en pour répondre directement aux questions sur "
        "le compte, le profil, le rôle, la progression ou les droits, en les redonnant "
        "sur demande. Pour le reste, appuie-toi sur les extraits ci-dessous, adaptés au "
        "rôle. Réponds en français, avec vouvoiement, de façon naturelle et concise : "
        "1 à 4 phrases, sans Markdown. Si ni ces informations ni les extraits ne "
        "contiennent la réponse, dis-le et invite à contacter le support — n'invente jamais."
    ),
    'en': (
        "You are the assistant of the Icosnet Training Library, the internal learning "
        "platform for learners, managers and administrators. You speak directly to the "
        "person shown in the user information below: address them as 'you', never in the "
        "third person, and never guess or assume their gender. That user information is a "
        "valid source — answer any question about their own account, profile, role, "
        "progress or permissions directly from it, reading their details back when asked. "
        "For everything else, rely on the excerpts below, tailored to their role. Reply in "
        "English, naturally and concisely: 1 to 4 sentences, no Markdown. If neither the "
        "user information nor the excerpts contains the answer, say so and suggest "
        "contacting support — never invent anything."
    ),
}

_NO_DOCS = {'fr': '(aucun extrait pertinent)', 'en': '(no relevant excerpt)'}
# The facts-block header repeats the 2nd-person / no-gender cue right at the data —
# small local models anchor on the reminder nearest the block they're reading.
_USER_PROMPTS = {
    'fr': ("Informations sur l'utilisateur — la personne à qui tu réponds "
           "(à vouvoyer ; ne suppose pas son genre) :\n{facts}\n\n"
           "Extraits de documentation :\n{docs}\n\nMessage de l'employé : {question}"),
    'en': ("User information — the person you are replying to "
           "(address as 'you', don't assume their gender):\n{facts}\n\n"
           "Documentation excerpts:\n{docs}\n\nEmployee message: {question}"),
}


def _build_context(chunks: list[dict]) -> str:
    return '\n\n'.join(f'[{i}] {c["title"]}\n{c["content"]}' for i, c in enumerate(chunks, start=1))


def _sources(chunks: list[dict]) -> list[dict]:
    seen, sources = set(), []
    for chunk in chunks:
        key = (chunk['title'], chunk['url'])
        if key in seen:
            continue
        seen.add(key)
        sources.append({'title': chunk['title'], 'url': chunk['url']})
        if len(sources) >= MAX_SOURCES:
            break
    return sources


# Role/language labels for the user-facts block, so the LLM knows *who* it is
# talking to and can tailor capabilities to their permissions.
_ROLE_LABELS = {
    'en': {'admin': 'Administrator', 'manager': 'Manager', 'user': 'Learner'},
    'fr': {'admin': 'Administrateur', 'manager': 'Manager', 'user': 'Apprenant'},
}

# What each role may actually do — stated outright so a permissions question
# ("can I create courses?") is answered from this always-present block rather than
# from whichever chunk retrieval happened to surface. Without it the model leans on
# its generic prior that "managers only assign, they don't author" and wrongly tells
# a manager they cannot create courses — they can (see courses.permissions.can_author:
# admins and managers both author; a manager owns the courses they create).
_ROLE_CAPABILITIES = {
    'en': {
        'admin': ('full access — create and manage any course, manage users, view '
                  'analytics and the audit log, and curate the assistant FAQ'),
        'manager': ('create, publish and assign your own courses and track your team '
                    'in Reports, plus everything a learner can do; you cannot manage '
                    'users or view platform-wide analytics, and you may only edit or '
                    'delete courses you authored'),
        'user': ('browse and enrol in courses, take lessons and quizzes, earn '
                 'certificates and badges, and use the community chat; you cannot '
                 'create or assign courses'),
    },
    'fr': {
        'admin': ('accès complet — créer et gérer tous les cours, gérer les '
                  'utilisateurs, consulter les analyses et le journal d’audit, et '
                  'gérer la FAQ de l’assistant'),
        'manager': ('créer, publier et affecter vos propres cours et suivre votre '
                    'équipe dans les Rapports, en plus de tout ce que fait un '
                    'apprenant ; vous ne pouvez pas gérer les utilisateurs ni voir '
                    'les analyses globales, et vous ne pouvez modifier ou supprimer '
                    'que les cours que vous avez créés'),
        'user': ('parcourir le catalogue et vous inscrire aux cours, suivre les '
                 'leçons et quiz, obtenir des certificats et des badges, et utiliser '
                 'le chat de la communauté ; vous ne pouvez pas créer ni affecter de cours'),
    },
}
_LANG_LABELS = {
    'en': {'fr': 'French', 'ar': 'Arabic', 'en': 'English'},
    'fr': {'fr': 'Français', 'ar': 'Arabe', 'en': 'Anglais'},
}


def _role_key(user) -> str:
    if getattr(user, 'is_admin_role', False):
        return 'admin'
    if getattr(user, 'is_manager_role', False):
        return 'manager'
    return 'user'


def _user_facts(user, language: str) -> str:
    """A compact, factual snapshot of the user — identity, role and their own
    learning state — so the LLM can answer 'what can I do here?', 'give me my
    account info' or 'how many certificates do I have?' accurately, in its own voice
    and framed for the right role."""
    from apps.courses.models import Course
    from apps.progress.models import Certificate, Enrollment, EnrollmentStatus

    certs = list(Certificate.objects.filter(user=user).values_list('course_title', flat=True))
    completed_ids = set(
        Enrollment.objects.filter(user=user, status=EnrollmentStatus.COMPLETED)
        .values_list('course_id', flat=True)
    )
    mandatory_ids = Course.objects.filter(
        is_published=True, is_mandatory=True
    ).values_list('id', flat=True)
    remaining = sum(1 for cid in mandatory_ids if cid not in completed_ids)
    points = user.points + user.badge_points
    cert_line = f'{len(certs)}' + (f' ({", ".join(certs)})' if certs else '')

    en = language == 'en'
    role_key = _role_key(user)
    labels = _ROLE_LABELS['en' if en else 'fr']
    role = labels[role_key]
    capabilities = _ROLE_CAPABILITIES['en' if en else 'fr'][role_key]
    department = getattr(getattr(user, 'department', None), 'name', '') or ''
    job_title = (getattr(user, 'job_title', '') or '').strip()
    lang_label = _LANG_LABELS['en' if en else 'fr'].get(user.language, user.language)
    name = user.full_name or user.email
    dash = '—'

    if en:
        return (f'- Name: {name}\n'
                f'- Role: {role}\n'
                f'- What you can do: {capabilities}\n'
                f'- Email: {user.email}\n'
                f'- Department: {department or dash}\n'
                f'- Job title: {job_title or dash}\n'
                f'- Preferred language: {lang_label}\n'
                f'- Certificates earned: {cert_line}\n'
                f'- Points: {points}\n'
                f'- Courses in progress: {user.courses_in_progress}, completed: {user.courses_completed}\n'
                f'- Mandatory courses still to complete: {remaining}')
    return (f'- Nom : {name}\n'
            f'- Rôle : {role}\n'
            f'- Ce que vous pouvez faire : {capabilities}\n'
            f'- E-mail : {user.email}\n'
            f'- Département : {department or dash}\n'
            f'- Intitulé du poste : {job_title or dash}\n'
            f'- Langue préférée : {lang_label}\n'
            f'- Certificats obtenus : {cert_line}\n'
            f'- Points : {points}\n'
            f'- Cours en cours : {user.courses_in_progress}, terminés : {user.courses_completed}\n'
            f'- Cours obligatoires restants : {remaining}')


# A short message riding on a prior turn ("as an admin i mean", "and for a
# manager?") carries almost no retrievable tokens on its own. Folding in the
# previous user turn lets the embedding land on the topic actually being discussed.
_FOLLOWUP_MAX_WORDS = 6


def _retrieval_queries(question: str, history: list[dict] | None) -> list[str]:
    """Embedding queries to score chunks against. The bare question is ALWAYS one of
    them; a short follow-up additionally gets the previous user turn folded in. Best-
    score merging (see `_retrieve_best`) then means folding can only add recall for an
    elliptical follow-up — it can never drag a short standalone question ('what are
    certificates?' after a password turn) off its own topic."""
    queries = [question]
    if history and len(question.split()) <= _FOLLOWUP_MAX_WORDS:
        prev_user = next(
            (m.get('content', '') for m in reversed(history) if m.get('role') == 'user'), ''
        )
        if prev_user:
            queries.append(f'{prev_user}\n{question}')
    return queries


def _retrieve_best(query_vectors, *, language, k, audiences) -> list[dict]:
    """Rank chunks by their best similarity across all query variants."""
    best: dict[int, dict] = {}
    for vector in query_vectors:
        for chunk in retrieve(vector, language=language, k=k, threshold=0.0, audiences=audiences):
            current = best.get(chunk['id'])
            if current is None or chunk['similarity'] > current['similarity']:
                best[chunk['id']] = chunk
    return sorted(best.values(), key=lambda c: -c['similarity'])


def answer(user, question: str, language: str, *, history=None,
           embedder=None, llm=None) -> dict | None:
    if not settings.ASSISTANT_RAG_ENABLED:
        return None
    if not KnowledgeChunk.objects.exists():
        return None  # index not built yet — use the offline engine

    started = time.monotonic()
    embedder = embedder or get_embedding_client()
    query_vectors = embedder.embed(_retrieval_queries(question, history))
    chunks = _retrieve_best(query_vectors, language=language,
                            k=settings.ASSISTANT_RAG_TOP_K,
                            audiences=audiences_for(user))

    # Prefill dominates latency on CPU, so only the best few chunks reach the model.
    context_chunks = [
        c for c in chunks if c['similarity'] >= CONTEXT_FLOOR
    ][:settings.ASSISTANT_RAG_MAX_CONTEXT]
    # Cite only from what actually reached the prompt, so a source link never points
    # at a document the answer wasn't written from.
    cited = [c for c in context_chunks
             if c['similarity'] >= settings.ASSISTANT_SIMILARITY_THRESHOLD]

    docs = _build_context(context_chunks) if context_chunks else _NO_DOCS[language]
    prompt = _USER_PROMPTS[language].format(
        facts=_user_facts(user, language), docs=docs, question=question,
    )
    llm = llm or get_llm_client()
    answer_text = llm.generate(SYSTEM_PROMPTS[language], prompt, history=history)

    logger.info(
        'assistant reply lang=%s latency=%.2fs top=%.3f cited=%s q=%r',
        language, time.monotonic() - started,
        chunks[0]['similarity'] if chunks else 0.0, [c['id'] for c in cited], question[:120],
    )
    return {'answer': answer_text, 'intent': 'rag', 'sources': _sources(cited)}
