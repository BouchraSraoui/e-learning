import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import Department, Role, User

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def learner(db):
    dep = Department.objects.create(name='Commercial')
    user = User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER, department=dep,
    )
    return user


def test_register_returns_tokens_and_user(client):
    dep = Department.objects.create(name='Commercial')
    resp = client.post('/api/auth/register/', {
        'full_name': 'New Hire',
        'email': 'new@gmail.com',
        'department': dep.id,
        'password': 'joinIcosnet2026',
    }, format='json')
    assert resp.status_code == 201, resp.data
    assert 'access' in resp.data and 'refresh' in resp.data
    assert resp.data['user']['email'] == 'new@gmail.com'
    assert resp.data['user']['role'] == 'user'
    assert resp.data['user']['full_name'] == 'New Hire'


def test_login_with_email_returns_user(client, learner):
    resp = client.post('/api/auth/login/', {
        'email': 'amir@gmail.com', 'password': 'password123',
    }, format='json')
    assert resp.status_code == 200, resp.data
    assert resp.data['user']['email'] == 'amir@gmail.com'
    assert resp.data['user']['stats']['courses_completed'] == 0


def test_login_wrong_password_rejected(client, learner):
    resp = client.post('/api/auth/login/', {
        'email': 'amir@gmail.com', 'password': 'wrong',
    }, format='json')
    assert resp.status_code == 401


def test_inactive_user_cannot_login(client, learner):
    learner.is_active = False
    learner.save()
    resp = client.post('/api/auth/login/', {
        'email': 'amir@gmail.com', 'password': 'password123',
    }, format='json')
    assert resp.status_code == 401


def test_me_requires_auth(client):
    assert client.get('/api/auth/me/').status_code == 401


def test_me_get_and_update(client, learner):
    client.force_authenticate(learner)
    assert client.get('/api/auth/me/').status_code == 200

    resp = client.patch('/api/auth/me/', {
        'first_name': 'Amir', 'last_name': 'Updated', 'job_title': 'Senior AM',
    }, format='json')
    assert resp.status_code == 200, resp.data
    assert resp.data['last_name'] == 'Updated'
    assert resp.data['job_title'] == 'Senior AM'
    learner.refresh_from_db()
    assert learner.last_name == 'Updated'


def test_me_cannot_change_role(client, learner):
    client.force_authenticate(learner)
    client.patch('/api/auth/me/', {'role': 'admin'}, format='json')
    learner.refresh_from_db()
    assert learner.role == Role.USER


def test_password_change(client, learner):
    client.force_authenticate(learner)
    resp = client.post('/api/auth/password/change/', {
        'current_password': 'password123', 'new_password': 'brandnew123',
    }, format='json')
    assert resp.status_code == 204
    learner.refresh_from_db()
    assert learner.check_password('brandnew123')


def test_forgot_password_sends_email_and_reset_works(client, learner):
    resp = client.post('/api/auth/password/forgot/', {'email': 'amir@gmail.com'}, format='json')
    assert resp.status_code == 200
    assert len(mail.outbox) == 1

    import re
    body = mail.outbox[0].body
    match = re.search(r'uid=([^&\s]+)&token=([^&\s]+)', body)
    assert match, body
    uid, token = match.group(1), match.group(2)

    resp = client.post('/api/auth/password/reset/', {
        'uid': uid, 'token': token, 'new_password': 'resetpass123',
    }, format='json')
    assert resp.status_code == 200, resp.data
    learner.refresh_from_db()
    assert learner.check_password('resetpass123')


def test_forgot_password_unknown_email_still_200(client):
    resp = client.post('/api/auth/password/forgot/', {'email': 'nobody@gmail.com'}, format='json')
    assert resp.status_code == 200
    assert len(mail.outbox) == 0


def test_logout_blacklists_refresh(client, learner):
    login = client.post('/api/auth/login/', {
        'email': 'amir@gmail.com', 'password': 'password123',
    }, format='json')
    refresh = login.data['refresh']
    client.force_authenticate(learner)
    resp = client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
    assert resp.status_code == 205
    resp = client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
    assert resp.status_code == 401
