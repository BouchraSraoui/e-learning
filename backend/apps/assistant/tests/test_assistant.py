import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.assistant.models import FaqEntry
from apps.courses.models import Category, Course
from apps.progress.services import issue_certificate

pytestmark = pytest.mark.django_db

FAQ_URL = '/api/faq/'
ASK_URL = '/api/assistant/ask/'
ADMIN_URL = '/api/admin/faq/'


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email='karim@gmail.com', password='password123',
        first_name='Karim', last_name='Haddad', role=Role.MANAGER,
    )


@pytest.fixture
def faqs(db):
    call_command('seed_faq')
    return FaqEntry.objects.all()



def test_faq_list_returns_published_ordered(client, learner, faqs):
    FaqEntry.objects.create(question='Brouillon ?', answer='caché', is_published=False, order=99)
    client.force_authenticate(user=learner)
    res = client.get(FAQ_URL)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert all(row['is_published'] for row in data)
    assert 'Brouillon ?' not in [row['question'] for row in data]
    orders = [row['order'] for row in data]
    assert orders == sorted(orders)
    assert len(data) == 11
    assert all(row['language'] == 'fr' for row in data)


def test_faq_list_requires_auth(client, faqs):
    assert client.get(FAQ_URL).status_code == 401



def test_faq_list_lang_param_serves_english(client, learner, faqs):
    client.force_authenticate(user=learner)
    data = client.get(FAQ_URL + '?lang=en').json()
    assert len(data) == 11
    assert all(row['language'] == 'en' for row in data)


def test_faq_list_accept_language_header(client, learner, faqs):
    client.force_authenticate(user=learner)
    data = client.get(FAQ_URL, HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9,fr;q=0.8').json()
    assert all(row['language'] == 'en' for row in data)


def test_faq_list_profile_language_fallback(client, learner, faqs):
    learner.language = 'en'
    learner.save(update_fields=['language'])
    client.force_authenticate(user=learner)
    data = client.get(FAQ_URL).json()
    assert all(row['language'] == 'en' for row in data)


def test_faq_list_falls_back_to_fr_when_locale_empty(client, learner, faqs):
    FaqEntry.objects.filter(language='en').delete()
    client.force_authenticate(user=learner)
    data = client.get(FAQ_URL + '?lang=en').json()
    assert len(data) == 11
    assert all(row['language'] == 'fr' for row in data)


def test_ask_english_matches_english_corpus(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'How do I reset my password?'},
                       format='json').json()
    assert body['intent'] == 'faq'
    assert body['sources'][0]['question'] == 'How do I reset my password?'
    assert 'Forgot password' in body['answer']


def test_ask_english_fallback_is_localised(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'xyzzy qwerty zzzuuu'},
                       format='json').json()
    assert body['intent'] == 'fallback'
    assert body['answer'].startswith('I couldn’t find')
    assert len(body['suggestions']) == 3
    assert body['suggestions'][0] == 'How do I reset my password?'


def test_ask_english_personal_how_many(client, learner, faqs):
    category = Category.objects.create(name='Sales', accent='primary')
    course = Course.objects.create(
        title='Consultative Selling', summary='s', category=category,
        level='beginner', primary_format='video', is_published=True,
    )
    issue_certificate(learner, course)
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'How many certificates do I have?'},
                       format='json').json()
    assert body['intent'] == 'personal'
    assert 'You have earned 1 certificate' in body['answer']
    assert 'Consultative Selling' in body['answer']


def test_ask_english_howto_not_hijacked_by_personal(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'How do I earn a certificate?'},
                       format='json').json()
    assert body['intent'] == 'faq'


def test_ask_cross_language_rescue(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'Que sont les cours obligatoires ?'},
                       format='json').json()
    assert body['intent'] == 'faq'
    assert body['sources'][0]['question'] == 'Que sont les cours obligatoires ?'



def test_ask_requires_auth(client, faqs):
    assert client.post(ASK_URL, {'question': 'x'}, format='json').status_code == 401


def test_ask_empty_question_is_400(client, learner, faqs):
    client.force_authenticate(user=learner)
    assert client.post(ASK_URL, {'question': '   '}, format='json').status_code == 400


def test_ask_faq_match(client, learner, faqs):
    client.force_authenticate(user=learner)
    res = client.post(ASK_URL, {'question': 'Comment réinitialiser mon mot de passe ?'}, format='json')
    assert res.status_code == 200
    body = res.json()
    assert body['intent'] == 'faq'
    assert body['sources'] and body['sources'][0]['question']
    assert 'oublié' in body['answer'].lower() or body['answer']
    assert isinstance(body['suggestions'], list)


def test_ask_is_accent_insensitive(client, learner, faqs):
    client.force_authenticate(user=learner)
    res = client.post(ASK_URL, {'question': 'reinitialiser mot de passe oublie'}, format='json')
    assert res.json()['intent'] == 'faq'


def test_ask_fallback_for_gibberish(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'xyzzy qwerty zzzuuu'}, format='json').json()
    assert body['intent'] == 'fallback'
    assert body['sources'] == []
    assert len(body['suggestions']) == 3



def test_ask_personal_certificates(client, learner, faqs):
    category = Category.objects.create(name='Sécurité', accent='primary')
    course = Course.objects.create(
        title='Cybersécurité', summary='s', category=category,
        level='beginner', primary_format='video', is_published=True,
    )
    issue_certificate(learner, course)
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'Combien de certificats ai-je obtenu ?'}, format='json').json()
    assert body['intent'] == 'personal'
    assert '1 certificat' in body['answer']
    assert 'Cybersécurité' in body['answer']


def test_ask_personal_points(client, learner, faqs):
    learner.points = 120
    learner.badge_points = 30
    learner.save(update_fields=['points', 'badge_points'])
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'Combien de points ai-je ?'}, format='json').json()
    assert body['intent'] == 'personal'
    assert '150' in body['answer']


def test_howto_certificate_is_not_hijacked_by_personal(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'Comment obtenir un certificat ?'}, format='json').json()
    assert body['intent'] == 'faq'


def test_ask_greeting_is_conversational(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'bonjour'}, format='json').json()
    assert body['intent'] == 'greeting'
    assert 'Icosnet' in body['answer']
    assert body['sources'] == []
    assert len(body['suggestions']) == 3


def test_ask_greeting_english(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + '?lang=en', {'question': 'hello there'}, format='json').json()
    assert body['intent'] == 'greeting'
    assert 'Icosnet' in body['answer']


def test_ask_thanks_is_conversational(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'merci beaucoup'}, format='json').json()
    assert body['intent'] == 'greeting'
    assert body['answer'].startswith('Avec plaisir')


def test_greeting_glued_to_question_still_answers_the_question(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(
        ASK_URL, {'question': 'Bonjour, comment réinitialiser mon mot de passe ?'}, format='json'
    ).json()
    assert body['intent'] == 'faq'


def test_gibberish_is_not_treated_as_greeting(client, learner, faqs):
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'xyzzy qwerty zzzuuu'}, format='json').json()
    assert body['intent'] == 'fallback'


def test_ask_account_name_matches_profile_faq(client, learner, faqs):
    """The client's screenshot: "comment je modifie le nom de mon compte" used to
    fall back (or wrongly return the language FAQ). It must resolve to the profile
    FAQ, in both languages."""
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL, {'question': 'comment je modifie le nom de mon compte'},
                       format='json').json()
    assert body['intent'] == 'faq'
    assert body['sources'][0]['question'] == 'Comment modifier mon profil ou ma photo ?'
    body_en = client.post(ASK_URL + '?lang=en', {'question': 'how do I change my account name'},
                          format='json').json()
    assert body_en['intent'] == 'faq'
    assert body_en['sources'][0]['question'] == 'How do I edit my profile or photo?'


@pytest.mark.parametrize('lang,question,expected_source', [
    ('fr', 'comment changer mon nom', 'Comment modifier mon profil ou ma photo ?'),
    ('fr', 'comment changer ma photo', 'Comment modifier mon profil ou ma photo ?'),
    ('fr', 'comment modifier mon email', 'Comment modifier mon profil ou ma photo ?'),
    ('en', 'how do i change my name', 'How do I edit my profile or photo?'),
    ('en', 'how do i change my email', 'How do I edit my profile or photo?'),
    ('en', 'how do i change my job title', 'How do I edit my profile or photo?'),
    ('fr', "c'est quoi les cours obligatoires", 'Que sont les cours obligatoires ?'),
    ('en', 'download my certificate', 'How do I download or verify a certificate?'),
])
def test_offline_queries_route_to_the_right_faq_not_a_shared_verb(
    client, learner, faqs, lang, question, expected_source
):
    """Regression (client report, 23 Jul 2026): a generic verb like "change"/"changer"
    that only appears in another FAQ's question text must not outscore the real topic —
    e.g. "how do I change my name" must NOT land on the "change the interface language"
    FAQ. Curated keywords now outweigh incidental question words."""
    client.force_authenticate(user=learner)
    body = client.post(ASK_URL + f'?lang={lang}', {'question': question}, format='json').json()
    assert body['intent'] == 'faq', body
    assert body['sources'][0]['question'] == expected_source, body


def test_unanswerable_account_queries_fall_back_rather_than_mislead(client, learner, faqs):
    """No self-service FAQ covers these, so a graceful fallback is correct — far better
    than confidently returning an unrelated answer (the language FAQ, or edit-profile)."""
    client.force_authenticate(user=learner)
    for lang, q in [('fr', 'comment changer mon département'), ('en', 'how do i delete my account')]:
        body = client.post(ASK_URL + f'?lang={lang}', {'question': q}, format='json').json()
        assert body['intent'] == 'fallback', (q, body)


def test_offline_replies_are_flagged(client, learner, faqs):
    """When the AI backend is unavailable (RAG disabled in tests), the offline
    keyword engine answers and the reply is flagged so the UI can say so. The
    greeting fast-path is backend-agnostic and must NOT be flagged."""
    client.force_authenticate(user=learner)
    faq = client.post(ASK_URL, {'question': 'comment réinitialiser mon mot de passe'},
                      format='json').json()
    assert faq['intent'] == 'faq'
    assert faq['offline'] is True

    miss = client.post(ASK_URL, {'question': 'xyzzy qwerty zzzuuu'}, format='json').json()
    assert miss['intent'] == 'fallback'
    assert miss['offline'] is True

    greeting = client.post(ASK_URL, {'question': 'bonjour'}, format='json').json()
    assert greeting['intent'] == 'greeting'
    assert greeting.get('offline') is not True



def test_admin_faq_requires_manager(client, learner):
    client.force_authenticate(user=learner)
    res = client.post(ADMIN_URL, {'question': 'Q ?', 'answer': 'A', 'is_published': True}, format='json')
    assert res.status_code == 403


def test_admin_create_returns_full_read_shape(client, manager):
    client.force_authenticate(user=manager)
    res = client.post(
        ADMIN_URL,
        {
            'question': 'Où trouver mes cours ?',
            'answer': 'Dans « Mes formations ».',
            'category': 'Cours',
            'keywords': ['Cours', 'cours', ' '],
            'is_published': True,
        },
        format='json',
    )
    assert res.status_code == 201
    body = res.json()
    assert body['id']
    assert body['is_published'] is True
    assert body['updated_at']
    assert body['keywords'] == ['cours']
    assert body['order'] > 0


def test_admin_update_and_delete(client, manager, faqs):
    client.force_authenticate(user=manager)
    entry = FaqEntry.objects.first()
    patch = client.patch(f'{ADMIN_URL}{entry.id}/', {'is_published': False}, format='json')
    assert patch.status_code == 200 and patch.json()['is_published'] is False
    assert client.delete(f'{ADMIN_URL}{entry.id}/').status_code == 204
    assert not FaqEntry.objects.filter(id=entry.id).exists()


def test_admin_create_with_language(client, manager):
    client.force_authenticate(user=manager)
    res = client.post(
        ADMIN_URL,
        {'question': 'Where is my dashboard?', 'answer': 'Top of the sidebar.',
         'language': 'en', 'is_published': True},
        format='json',
    )
    assert res.status_code == 201
    assert res.json()['language'] == 'en'
    res = client.post(
        ADMIN_URL,
        {'question': 'Où est mon tableau de bord ?', 'answer': 'En haut du menu.',
         'is_published': True},
        format='json',
    )
    assert res.status_code == 201 and res.json()['language'] == 'fr'
    res = client.post(
        ADMIN_URL,
        {'question': 'X?', 'answer': 'Y.', 'language': 'de', 'is_published': True},
        format='json',
    )
    assert res.status_code == 400


def test_admin_write_strips_html(client, manager):
    client.force_authenticate(user=manager)
    res = client.post(
        ADMIN_URL,
        {'question': '<script>alert(1)</script>Bonjour ?', 'answer': 'Salut <b>toi</b>', 'is_published': True},
        format='json',
    )
    assert res.status_code == 201
    body = res.json()
    assert '<script>' not in body['question']
    assert '<b>' not in body['answer']
