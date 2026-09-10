import pytest
from asgiref.sync import async_to_sync
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Role, User
from apps.common.channels_auth import _extract_token, _user_from_token
from apps.community.models import ChatBan, ChatMessage, ChatRoom

pytestmark = pytest.mark.django_db


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
def other(db):
    return User.objects.create_user(
        email='nadia@gmail.com', password='password123',
        first_name='Nadia', last_name='Sahli', role=Role.USER,
    )


@pytest.fixture
def trainer(db):
    return User.objects.create_user(
        email='yasmine@gmail.com', password='password123',
        first_name='Yasmine', last_name='Belkacem', role=Role.MANAGER,
    )


@pytest.fixture
def room(db):
    return ChatRoom.objects.create(slug='general', name='General')



def test_rooms_list(client, learner, room):
    client.force_authenticate(learner)
    resp = client.get('/api/rooms/')
    assert resp.status_code == 200 and len(resp.data) == 1
    assert resp.data[0]['slug'] == 'general'


def test_post_and_get_messages(client, learner, room):
    client.force_authenticate(learner)
    posted = client.post('/api/rooms/general/messages/', {'body': 'Hello team'}, format='json')
    assert posted.status_code == 201 and posted.data['body'] == 'Hello team'
    assert posted.data['author_name'] == 'Amir Rahmani'
    history = client.get('/api/rooms/general/messages/')
    assert history.status_code == 200 and len(history.data) == 1


def test_message_strips_html(client, learner, room):
    client.force_authenticate(learner)
    resp = client.post('/api/rooms/general/messages/',
                       {'body': '<img src=x onerror=alert(1)>hey'}, format='json')
    assert resp.status_code == 201 and '<img' not in resp.data['body']


def test_author_can_delete_own_message(client, learner, room):
    msg = ChatMessage.objects.create(room=room, author=learner, body='oops')
    client.force_authenticate(learner)
    resp = client.delete(f'/api/messages/{msg.id}/')
    assert resp.status_code == 204
    msg.refresh_from_db()
    assert msg.is_deleted is True


def test_learner_cannot_delete_others_message(client, learner, other, room):
    msg = ChatMessage.objects.create(room=room, author=other, body='hi')
    client.force_authenticate(learner)
    resp = client.delete(f'/api/messages/{msg.id}/')
    assert resp.status_code == 403


def test_moderator_can_delete_any_message(client, other, trainer, room):
    msg = ChatMessage.objects.create(room=room, author=other, body='spam')
    client.force_authenticate(trainer)
    resp = client.delete(f'/api/messages/{msg.id}/')
    assert resp.status_code == 204


def test_deleted_message_hidden_from_history(client, learner, room):
    ChatMessage.objects.create(room=room, author=learner, body='live')
    ChatMessage.objects.create(room=room, author=learner, body='gone', is_deleted=True)
    client.force_authenticate(learner)
    resp = client.get('/api/rooms/general/messages/')
    bodies = [m['body'] for m in resp.data]
    assert bodies == ['live']


def test_moderator_bans_user_then_post_forbidden(client, learner, trainer, room):
    client.force_authenticate(trainer)
    ban = client.post('/api/rooms/general/ban/', {'user_id': learner.id}, format='json')
    assert ban.status_code == 201 and ChatBan.objects.filter(room=room, user=learner).exists()
    client.force_authenticate(learner)
    resp = client.post('/api/rooms/general/messages/', {'body': 'still here?'}, format='json')
    assert resp.status_code == 403 and resp.data['code'] == 'banned'


def test_learner_cannot_ban(client, learner, other, room):
    client.force_authenticate(learner)
    resp = client.post('/api/rooms/general/ban/', {'user_id': other.id}, format='json')
    assert resp.status_code == 403


def test_trainer_cannot_ban_admin(client, trainer, room, db):
    admin = User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='Mansouri', role=Role.ADMIN,
    )
    client.force_authenticate(trainer)
    resp = client.post('/api/rooms/general/ban/', {'user_id': admin.id}, format='json')
    assert resp.status_code == 403 and not ChatBan.objects.filter(user=admin).exists()


def test_moderator_cannot_ban_self(client, trainer, room):
    client.force_authenticate(trainer)
    resp = client.post('/api/rooms/general/ban/', {'user_id': trainer.id}, format='json')
    assert resp.status_code == 403



def test_extract_token_from_query_string():
    scope = {'query_string': b'token=abc123', 'headers': []}
    assert _extract_token(scope) == 'abc123'


def test_extract_token_from_subprotocol():
    scope = {'query_string': b'', 'headers': [(b'sec-websocket-protocol', b'jwt, xyz789')]}
    assert _extract_token(scope) == 'xyz789'


def test_extract_token_absent():
    assert _extract_token({'query_string': b'', 'headers': []}) is None


def test_valid_token_resolves_to_user(learner):
    token = str(RefreshToken.for_user(learner).access_token)
    resolved = async_to_sync(_user_from_token)(token)
    assert resolved.is_authenticated and resolved.id == learner.id


def test_bad_token_resolves_to_anonymous():
    resolved = async_to_sync(_user_from_token)('not-a-jwt')
    assert isinstance(resolved, AnonymousUser)
