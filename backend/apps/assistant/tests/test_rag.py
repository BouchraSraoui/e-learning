import pytest
import requests
from django.conf import settings
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Department, Role, User
from apps.assistant.chunker import split_text, strip_html
from apps.assistant.clients import (
    AssistantBackendError, OllamaEmbeddingClient, OllamaLLMClient,
)
from apps.assistant.ingest import (
    _build_chunks, _help_docs, _normalize, rebuild_index, reconcile_index,
)
from apps.assistant.models import Audience, FaqEntry, KnowledgeChunk, SourceType
from apps.assistant.rag import _retrieval_queries, _user_facts
from apps.assistant.rag import answer as rag_answer
from apps.assistant.retrieval import audiences_for, retrieve
from apps.assistant.tests.stubs import DIM, StubEmbeddingClient
from apps.assistant.views import MAX_HISTORY_CHARS, MAX_HISTORY_TURNS, _clean_history
from apps.courses.models import Course, Lesson, Module

pytestmark = pytest.mark.django_db

ASK_URL = '/api/assistant/ask/'

RAG_STUBS = dict(
    ASSISTANT_RAG_ENABLED=True,
    ASSISTANT_EMBED_CLIENT='apps.assistant.tests.stubs.StubEmbeddingClient',
    ASSISTANT_LLM_CLIENT='apps.assistant.tests.stubs.StubLLMClient',
    ASSISTANT_SIMILARITY_THRESHOLD=0.35,
)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )


def _make_course(published=True, title='Sécurité informatique'):
    course = Course.objects.create(
        title=title,
        summary='Apprenez à reconnaître le phishing et les emails frauduleux',
        description='<p>Bonnes pratiques de cybersécurité au bureau.</p>',
        is_published=published,
    )
    module = Module.objects.create(course=course, title='Menaces courantes')
    Lesson.objects.create(
        module=module, title='Reconnaître le phishing', content_type='text',
        rich_text='<p>Un email frauduleux de phishing imite une source légitime.</p>',
    )
    return course


# ---------------------------------------------------------------- ingestion

@override_settings(**RAG_STUBS)
def test_rebuild_index_covers_published_content_only():
    FaqEntry.objects.create(question='Comment changer mon avatar ?', answer='Depuis le profil.')
    draft_faq = FaqEntry.objects.create(question='Brouillon ?', answer='caché', is_published=False)
    course = _make_course(published=True)
    draft = _make_course(published=False, title='Cours brouillon secret')

    rebuild_index()

    assert KnowledgeChunk.objects.filter(source_type=SourceType.COURSE,
                                         source_id=str(course.id)).exists()
    assert KnowledgeChunk.objects.filter(source_type=SourceType.LESSON,
                                         source_id__startswith=f'{course.id}:').exists()
    assert not KnowledgeChunk.objects.filter(source_type=SourceType.COURSE,
                                             source_id=str(draft.id)).exists()
    assert KnowledgeChunk.objects.filter(source_type=SourceType.FAQ).count() == 1
    assert not KnowledgeChunk.objects.filter(source_id=str(draft_faq.id),
                                             source_type=SourceType.FAQ).exists()
    # The FR/EN how-to corpus ships with the app.
    assert KnowledgeChunk.objects.filter(source_type=SourceType.DOC, language='fr').exists()
    assert KnowledgeChunk.objects.filter(source_type=SourceType.DOC, language='en').exists()


@override_settings(**RAG_STUBS)
def test_signals_keep_index_fresh():
    course = _make_course(published=True)
    assert KnowledgeChunk.objects.filter(source_id=str(course.id)).exists()

    course.is_published = False
    course.save()
    assert not KnowledgeChunk.objects.filter(source_id=str(course.id)).exists()
    assert not KnowledgeChunk.objects.filter(source_id__startswith=f'{course.id}:').exists()

    faq = FaqEntry.objects.create(question='Où voir mes badges ?', answer='Page Badges.')
    assert KnowledgeChunk.objects.filter(source_type=SourceType.FAQ,
                                         source_id=str(faq.id)).exists()
    faq.delete()
    assert not KnowledgeChunk.objects.filter(source_type=SourceType.FAQ,
                                             source_id=str(faq.id)).exists()


# ---------------------------------------------------------------- retrieval

def test_retrieve_ranks_by_similarity_and_filters_language():
    embedder = StubEmbeddingClient()
    FaqEntry.objects.create(
        question='Comment obtenir un certificat de formation ?',
        answer='Terminez le cours et réussissez le quiz.', language='fr',
    )
    FaqEntry.objects.create(
        question='How do I earn a training certificate?',
        answer='Complete the course and pass the quiz.', language='en',
    )
    rebuild_index(embedder=embedder)

    hits = retrieve(embedder.vector('how do i earn a training certificate'),
                    language='en', k=5, threshold=0.2)
    assert hits, 'expected at least one hit'
    languages = set(
        KnowledgeChunk.objects.filter(id__in=[h['id'] for h in hits])
        .values_list('language', flat=True)
    )
    assert 'fr' not in languages  # fr-only chunks are never served to an EN query
    assert 'certificate' in hits[0]['title'].lower()


def test_retrieve_empty_index_returns_nothing():
    assert retrieve([1.0] * DIM, language='fr', k=5, threshold=0.1) == []


# ---------------------------------------------------------------- ask endpoint

@override_settings(**RAG_STUBS)
def test_ask_returns_grounded_rag_answer_with_cited_sources(client, learner):
    _make_course(published=True)
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question':
                                'Comment reconnaître le phishing et les emails frauduleux ?'})
    assert res.status_code == 200
    data = res.json()
    assert data['intent'] == 'rag'
    assert data['answer'] == 'GROUNDED_STUB_ANSWER'
    assert data['sources'], 'RAG replies must cite sources'
    assert {'title', 'url'} <= set(data['sources'][0])
    assert isinstance(data['suggestions'], list)


@override_settings(**{**RAG_STUBS, 'ASSISTANT_SIMILARITY_THRESHOLD': 0.99})
def test_llm_answers_even_without_a_strongly_matching_source(client, learner):
    # The LLM now handles every message; a weak retrieval no longer falls back to
    # keyword FAQ — it still answers, just without citing sources.
    call_command('seed_faq')
    _make_course(published=True)
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question': 'Comment réinitialiser mon mot de passe ?'})
    assert res.status_code == 200
    data = res.json()
    assert data['intent'] == 'rag'
    assert data['answer'] == 'GROUNDED_STUB_ANSWER'
    assert data['sources'] == []  # nothing cleared the 0.99 citation threshold


@override_settings(**{**RAG_STUBS,
                      'ASSISTANT_EMBED_CLIENT': 'apps.assistant.tests.stubs.DownEmbeddingClient'})
def test_backend_down_degrades_to_keyword_faq(client, learner):
    call_command('seed_faq')
    # A pre-existing chunk so rag reaches the (failing) embed call.
    KnowledgeChunk.objects.create(
        content='x', embedding=[0.0] * DIM, source_type=SourceType.DOC,
        source_id='x.fr', title='x', language='fr',
    )
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question': 'Comment obtenir un certificat ?'})
    assert res.status_code == 200
    assert res.json()['intent'] == 'faq'


@override_settings(**RAG_STUBS)
def test_llm_handles_personal_questions_with_injected_stats(client, learner):
    # Personal questions now go through the LLM too (their live stats are injected
    # into its context), rather than the templated personal router — which is kept
    # only for the offline (backend-down) path.
    call_command('seed_faq')
    _make_course(published=True)
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question': 'Combien de certificats ai-je obtenus ?'})
    assert res.status_code == 200
    assert res.json()['intent'] == 'rag'


# ------------------------------------------------------- greeting fast path

# Any model call on this path raises AssertionError rather than degrading, so a
# regression that routes greetings back through RAG fails the test loudly.
NO_MODEL_STUBS = {
    **RAG_STUBS,
    'ASSISTANT_EMBED_CLIENT': 'apps.assistant.tests.stubs.ExplodingEmbeddingClient',
    'ASSISTANT_LLM_CLIENT': 'apps.assistant.tests.stubs.ExplodingLLMClient',
}


@pytest.fixture
def seeded_faq(db):
    """Seeded through a fixture, i.e. before any @override_settings takes effect, so
    the FAQ re-embed signals stay inert and never touch the stub clients."""
    call_command('seed_faq')


def _indexed_chunk(text='contenu', audience='', title='doc', source_id='doc.fr', language='fr'):
    return KnowledgeChunk.objects.create(
        content=text, embedding=_normalize(StubEmbeddingClient.vector(text)),
        source_type=SourceType.DOC, source_id=source_id, title=title,
        language=language, audience=audience,
    )


@pytest.mark.parametrize('question', ['Bonjour', 'hello', 'Merci beaucoup !', 'salut, ça va ?'])
@override_settings(**NO_MODEL_STUBS)
def test_greetings_are_answered_without_calling_any_model(client, learner, seeded_faq, question):
    _indexed_chunk()  # a built index, so RAG would otherwise run
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question': question})

    assert res.status_code == 200
    data = res.json()
    assert data['intent'] == 'greeting'
    assert data['suggestions'], 'a greeting should still offer somewhere to go'


@override_settings(**NO_MODEL_STUBS)
def test_greeting_addresses_the_user_by_name(client, learner, seeded_faq):
    _indexed_chunk()
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question': 'Bonjour'})

    assert 'Amir' in res.json()['answer']


@override_settings(**RAG_STUBS)
def test_greeting_glued_to_a_real_question_still_reaches_the_llm(client, learner):
    _make_course(published=True)
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {'question':
                                'Bonjour, comment reconnaître le phishing ?'})

    assert res.json()['intent'] == 'rag'


# ----------------------------------------------------------- audience scoping

@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email='karim@gmail.com', password='password123',
        first_name='Karim', last_name='Bensalah', role=Role.MANAGER,
    )


@pytest.fixture
def administrator(db):
    return User.objects.create_user(
        email='sofia@gmail.com', password='password123',
        first_name='Sofia', last_name='Mansouri', role=Role.ADMIN,
    )


def test_audiences_for_follows_the_three_role_model(learner, manager, administrator):
    assert audiences_for(learner) == ['']
    assert audiences_for(manager) == ['', Audience.MANAGER]
    assert audiences_for(administrator) == ['', Audience.MANAGER, Audience.ADMIN]
    # A Django superuser is an admin even without the role column set.
    superuser = User.objects.create_user(
        email='root@gmail.com', password='password123', role=Role.USER, is_superuser=True,
    )
    assert Audience.ADMIN in audiences_for(superuser)


def test_role_guides_are_never_retrieved_for_a_learner(learner, manager, administrator):
    text = 'assigner un cours à un utilisateur depuis les affectations'
    _indexed_chunk(text, audience=Audience.ADMIN, title='admin-guide', source_id='admin-guide.fr')
    _indexed_chunk(text, audience=Audience.MANAGER, title='manager-guide',
                   source_id='manager-guide.fr')
    _indexed_chunk(text, audience='', title='enrolment', source_id='enrolment.fr')
    query = StubEmbeddingClient.vector(text)

    def titles(user):
        return {h['title'] for h in retrieve(query, language='fr', k=10, threshold=0.0,
                                             audiences=audiences_for(user))}

    assert titles(learner) == {'enrolment'}
    assert titles(manager) == {'enrolment', 'manager-guide'}
    assert titles(administrator) == {'enrolment', 'manager-guide', 'admin-guide'}


def test_help_doc_headers_are_parsed_and_unknown_audiences_fail_closed(tmp_path, monkeypatch):
    (tmp_path / 'admin-guide.fr.md').write_text(
        '# Guide administrateur\nURL: /admin/users\nAudience: admin\n\nCorps du guide.',
        encoding='utf-8')
    (tmp_path / 'enrolment.fr.md').write_text(
        "# S'inscrire\nURL: /catalog\n\nCorps.", encoding='utf-8')
    (tmp_path / 'typo.fr.md').write_text(
        '# Typo\nURL: /x\nAudience: managerr\n\nCorps.', encoding='utf-8')
    monkeypatch.setattr('apps.assistant.ingest.CORPUS_DIR', tmp_path)

    docs = {d['source_id']: d for d in _help_docs()}

    assert docs['admin-guide.fr']['audience'] == Audience.ADMIN
    assert docs['admin-guide.fr']['url'] == '/admin/users'
    assert docs['admin-guide.fr']['text'].startswith('Guide administrateur\nCorps')
    assert docs['enrolment.fr']['audience'] == ''
    # An unrecognised tag must not publish a role guide to every learner.
    assert docs['typo.fr']['audience'] == Audience.ADMIN


# ---------------------------------------------------------------- reconcile

@override_settings(**RAG_STUBS)
def test_reconcile_reindexes_missing_documents_and_drops_orphans():
    course = _make_course(published=True)
    rebuild_index(embedder=StubEmbeddingClient())
    # A re-embed signal that fired while Ollama was down leaves the course unindexed…
    KnowledgeChunk.objects.filter(source_type=SourceType.COURSE,
                                  source_id=str(course.id)).delete()
    # …and a deleted corpus file leaves chunks behind.
    _indexed_chunk(title='ghost', source_id='ghost.fr')

    result = reconcile_index(embedder=StubEmbeddingClient())

    assert KnowledgeChunk.objects.filter(source_type=SourceType.COURSE,
                                         source_id=str(course.id)).exists()
    assert not KnowledgeChunk.objects.filter(source_id='ghost.fr').exists()
    assert result['documents_added'] >= 1
    assert result['documents_removed'] == 1
    assert result['chunks_added'] >= 1


# ------------------------------------------------------------ ollama payloads

def test_ollama_payloads_pin_the_models_and_cap_decoding(monkeypatch):
    captured = {}

    class _Response:
        def raise_for_status(self):
            pass

        def json(self):
            return {'embeddings': [[0.1] * 4], 'message': {'content': 'ok'}}

    def fake_post(url, json=None, timeout=None):
        captured[url.rsplit('/', 1)[-1]] = json
        return _Response()

    monkeypatch.setattr('apps.assistant.clients.requests.post', fake_post)

    OllamaEmbeddingClient().embed(['x'])
    OllamaLLMClient().generate('system', 'prompt')

    # Without keep_alive Ollama unloads the model after 5 idle minutes and the first
    # question of every session pays a multi-GB reload.
    assert captured['embed']['keep_alive'] == settings.ASSISTANT_OLLAMA_KEEP_ALIVE
    chat = captured['chat']
    assert chat['keep_alive'] == settings.ASSISTANT_OLLAMA_KEEP_ALIVE
    assert chat['options']['num_predict'] == settings.ASSISTANT_LLM_NUM_PREDICT
    assert chat['options']['num_ctx'] == settings.ASSISTANT_LLM_NUM_CTX


@override_settings(ASSISTANT_OLLAMA_URL='http://tunnel:11434',
                   ASSISTANT_OLLAMA_FALLBACK_URL='http://127.0.0.1:11434')
def test_ollama_falls_back_to_local_when_the_primary_tunnel_is_down(monkeypatch):
    # A dead/rotated dev GPU tunnel must degrade to the local Ollama instead of
    # dropping the whole assistant to the offline FAQ.
    seen = []

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {'embeddings': [[0.1] * 4], 'message': {'content': 'ok'}}

    def fake_post(url, json=None, timeout=None):
        seen.append(url)
        if 'tunnel' in url:  # the dead primary
            raise requests.ConnectionError('tunnel down')
        return _Resp()

    monkeypatch.setattr('apps.assistant.clients.requests.post', fake_post)

    assert OllamaLLMClient().generate('system', 'prompt') == 'ok'
    assert OllamaEmbeddingClient().embed(['x']) == [[0.1] * 4]
    # Each call tried the tunnel first, then the local fallback.
    assert any('tunnel' in u for u in seen) and any('127.0.0.1' in u for u in seen)


@override_settings(ASSISTANT_OLLAMA_URL='http://tunnel:11434',
                   ASSISTANT_OLLAMA_FALLBACK_URL='http://127.0.0.1:11434')
def test_ollama_raises_backend_error_when_primary_and_fallback_are_both_down(monkeypatch):
    def fake_post(url, json=None, timeout=None):
        raise requests.ConnectionError('down')

    monkeypatch.setattr('apps.assistant.clients.requests.post', fake_post)

    with pytest.raises(AssistantBackendError):
        OllamaLLMClient().generate('system', 'prompt')


# ---------------------------------------------------------------- chunker

def test_continuation_chunks_carry_the_document_title():
    body = '\n\n'.join(f'Paragraphe {i}. ' + 'mot ' * 200 for i in range(6))
    doc = {
        'text': f'Guide du manager\n{body}', 'source_type': SourceType.DOC,
        'source_id': 'manager-guide.fr', 'title': 'Guide du manager', 'url': '',
        'language': 'fr', 'audience': Audience.MANAGER,
    }

    rows = _build_chunks([doc], StubEmbeddingClient())

    assert len(rows) > 1, 'expected the guide to split into several chunks'
    # A chunk retrieved on its own must still say which document it came from.
    assert all(row.content.startswith('Guide du manager') for row in rows)
    assert all(row.audience == Audience.MANAGER for row in rows)


def test_split_text_respects_size_and_overlap():
    text = '\n\n'.join(f'Paragraphe {i}. ' + 'mot ' * 120 for i in range(8))
    chunks = split_text(text, max_chars=1000, overlap=100)
    assert len(chunks) > 1
    assert all(len(c) <= 1200 for c in chunks)  # window + carried overlap headroom


def test_strip_html_flattens_rich_text():
    assert strip_html('<p>Un <strong>email</strong> frauduleux</p>') == 'Un email frauduleux'


# ----------------------------------------------- identity, role & conversation

class _RecordingLLM:
    """Captures what the RAG layer hands the model, so a test can assert the user's
    identity and prior turns actually make it into the prompt."""

    def __init__(self):
        self.system = self.prompt = self.history = None

    def generate(self, system, prompt, history=None):
        self.system, self.prompt, self.history = system, prompt, history
        return 'RECORDED_ANSWER'


def test_user_facts_state_identity_and_role(administrator):
    administrator.department = Department.objects.create(name='IT')
    administrator.job_title = 'Platform Admin'
    administrator.save(update_fields=['department', 'job_title'])

    facts = _user_facts(administrator, 'en')

    # 'give me my account information' can now be answered from these lines.
    assert 'Sofia Mansouri' in facts
    assert administrator.email in facts
    assert 'IT' in facts
    assert 'Platform Admin' in facts
    # 'what can I do here?' gets a role-appropriate answer because the role is stated.
    assert 'Administrator' in facts


def test_learner_and_manager_facts_carry_the_right_role(learner, manager):
    assert 'Learner' in _user_facts(learner, 'en')
    assert 'Apprenant' in _user_facts(learner, 'fr')
    assert 'Manager' in _user_facts(manager, 'en')


def test_facts_state_that_a_manager_can_create_courses(manager, learner, administrator):
    # Regression guard for the live bug: asked "can I create courses?" the assistant
    # told a manager "no" because the always-present facts block stated only the role
    # label, never its capabilities, so the answer rode on whichever chunk retrieval
    # surfaced. can_author() grants course creation to admins AND managers — the facts
    # block must say so outright, in both languages.
    for language in ('en', 'fr'):
        manager_facts = _user_facts(manager, language).lower()
        assert 'creat' in manager_facts or 'créer' in manager_facts
        # A learner cannot author, so their capability line must not claim creation.
        learner_facts = _user_facts(learner, language).lower()
        assert 'cannot create' in learner_facts or 'ne pouvez pas créer' in learner_facts
    # And the admin still gets a fuller capability statement.
    assert 'manage users' in _user_facts(administrator, 'en').lower()


@override_settings(**RAG_STUBS)
def test_history_and_identity_reach_the_model(administrator):
    _indexed_chunk(title='admin-guide', source_id='admin-guide.fr', audience=Audience.ADMIN)
    rec = _RecordingLLM()
    history = [
        {'role': 'user', 'content': 'tell me all the things i can do on the platform'},
        {'role': 'assistant', 'content': 'You can earn points, badges and certificates.'},
    ]

    reply = rag_answer(administrator, 'as an admin i mean', 'en',
                       history=history, embedder=StubEmbeddingClient(), llm=rec)

    assert reply['intent'] == 'rag'
    # The prior turns are forwarded verbatim as chat messages (not folded into the prompt).
    assert rec.history == history
    # The model is told who it is talking to, so it stops answering an admin as a learner.
    assert 'Administrator' in rec.prompt
    assert administrator.email in rec.prompt


@override_settings(**RAG_STUBS)
def test_prompt_addresses_the_user_directly_and_never_guesses_gender(administrator):
    # Regression guard for the live bug: the assistant narrated the user in the THIRD
    # person and guessed gender from the name ("Sofia" -> "she can access..."), and
    # refused to relay the injected account block ("there is no need... already
    # available for Sofia Mansouri"). Root cause was third-person framing with no "you
    # are talking TO this person" instruction and no license to answer from the block.
    from apps.assistant.rag import SYSTEM_PROMPTS

    _indexed_chunk(title='admin-guide', source_id='admin-guide.fr', audience=Audience.ADMIN)
    rec = _RecordingLLM()
    rag_answer(administrator, 'give me my account information', 'en',
               embedder=StubEmbeddingClient(), llm=rec)

    # The system prompt actually handed to the model must tell it to speak TO the user,
    # forbid third-person/gender guessing, and license the account block as a source.
    sys_l = rec.system.lower()
    assert "address them as 'you'" in sys_l
    assert 'third person' in sys_l
    assert 'never guess or assume their gender' in sys_l
    assert 'valid source' in sys_l  # so "give me my account info" is relayed, not bounced
    # The facts-block header repeats the 2nd-person cue right at the data.
    assert 'the person you are replying to' in rec.prompt.lower()

    # French carries the same guarantees, plus output-side steering against gendered
    # agreement (vouvoiement, no third person, keep the role label, avoid inscrit(e)).
    fr = SYSTEM_PROMPTS['fr'].lower()
    assert 'vouvoiement' in fr
    assert 'troisième personne' in fr
    assert 'ne devine jamais son genre' in fr
    assert 'source valide' in fr


def test_retrieval_queries_fold_prior_turn_but_always_keep_the_bare_question():
    history = [
        {'role': 'user', 'content': 'tell me all the things i can do on the platform'},
        {'role': 'assistant', 'content': 'You can earn points...'},
    ]
    queries = _retrieval_queries('as an admin i mean', history)
    # The bare question is always a variant, so a short standalone question can never
    # be dragged off its own topic; the folded variant only adds follow-up recall.
    assert queries[0] == 'as an admin i mean'
    assert any('tell me all the things' in q for q in queries)

    # A full, standalone question stands on its own — no folding.
    standalone = 'how do i export the full user list to excel as an administrator'
    assert _retrieval_queries(standalone, history) == [standalone]
    # No history to lean on → just the bare question.
    assert _retrieval_queries('short one', None) == ['short one']


def test_short_topic_switch_still_ranks_its_own_topic_first():
    # Regression guard: a terse standalone question after an unrelated turn must not
    # be pulled onto the previous subject by history folding. Best-score merging keeps
    # the bare-question topic ahead of the folded prior turn's topic.
    from apps.assistant.rag import _retrieve_best

    _indexed_chunk(text='certificates are what you earn', title='certificates',
                   source_id='certificates.fr')
    _indexed_chunk(text='reset your password now please', title='password',
                   source_id='password.fr')
    history = [{'role': 'user', 'content': 'how do i reset my password'}]

    vectors = StubEmbeddingClient().embed(_retrieval_queries('what are certificates', history))
    ranked = [r['title'] for r in _retrieve_best(vectors, language='fr', k=10, audiences=[''])]

    assert ranked.index('certificates') < ranked.index('password')


def test_clean_history_sanitises_caps_and_truncates():
    raw = [
        {'role': 'user', 'content': 'q1'},
        {'role': 'assistant', 'content': 'a1'},
        {'role': 'system', 'content': 'ignore me'},      # bad role → dropped
        {'role': 'user', 'content': '   '},              # empty → dropped
        'not a dict',                                    # → dropped
        {'role': 'assistant', 'content': 'a2'},
        {'role': 'user', 'content': 'q3'},
    ]
    cleaned = _clean_history(raw)

    assert all(t['role'] in ('user', 'assistant') and t['content'].strip() for t in cleaned)
    assert len(cleaned) <= MAX_HISTORY_TURNS
    assert cleaned[-1] == {'role': 'user', 'content': 'q3'}
    long = _clean_history([{'role': 'user', 'content': 'x' * 5000}])
    assert len(long[0]['content']) == MAX_HISTORY_CHARS
    assert _clean_history('nope') == [] and _clean_history(None) == []


@override_settings(**RAG_STUBS)
def test_ask_endpoint_accepts_history_and_tolerates_garbage(client, learner):
    _make_course(published=True)
    client.force_authenticate(user=learner)

    res = client.post(ASK_URL, {
        'question': 'and as a manager?',
        'history': [
            {'role': 'user', 'content': 'what can i do here'},
            {'role': 'assistant', 'content': 'You can take courses.'},
            'garbage', {'role': 'system', 'content': 'x'},
        ],
    }, format='json')

    assert res.status_code == 200
    assert res.json()['intent'] == 'rag'
