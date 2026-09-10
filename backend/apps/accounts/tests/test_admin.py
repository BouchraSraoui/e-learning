import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Department, Role, User

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='Mansouri', role=Role.ADMIN,
    )


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )


def test_departments_public(client):
    Department.objects.create(name='Commercial')
    resp = client.get('/api/departments/')
    assert resp.status_code == 200
    assert any(d['name'] == 'Commercial' for d in resp.data)


def test_non_admin_cannot_list_users(client, learner):
    client.force_authenticate(learner)
    assert client.get('/api/admin/users/').status_code == 403


def test_admin_lists_users_paginated(client, admin, learner):
    client.force_authenticate(admin)
    resp = client.get('/api/admin/users/')
    assert resp.status_code == 200
    assert 'results' in resp.data and 'count' in resp.data
    assert resp.data['count'] >= 2


def test_admin_search_and_filter(client, admin, learner):
    client.force_authenticate(admin)
    resp = client.get('/api/admin/users/?search=amir')
    assert resp.status_code == 200
    assert resp.data['count'] == 1

    resp = client.get('/api/admin/users/?role=user')
    assert all(u['role'] == 'user' for u in resp.data['results'])


def test_admin_creates_user(client, admin):
    dep = Department.objects.create(name='Technical')
    client.force_authenticate(admin)
    resp = client.post('/api/admin/users/', {
        'email': 'newtrainer@gmail.com', 'first_name': 'Nadia', 'last_name': 'Sahraoui',
        'role': 'manager', 'department': dep.id, 'password': 'password123',
    }, format='json')
    assert resp.status_code == 201, resp.data
    assert User.objects.filter(email='newtrainer@gmail.com', role='manager').exists()


def test_admin_deactivate_blocks_login(client, admin, learner):
    client.force_authenticate(admin)
    resp = client.patch(f'/api/admin/users/{learner.id}/', {'is_active': False}, format='json')
    assert resp.status_code == 200
    learner.refresh_from_db()
    assert learner.is_active is False

    anon = APIClient()
    resp = anon.post('/api/auth/login/', {
        'email': 'amir@gmail.com', 'password': 'password123',
    }, format='json')
    assert resp.status_code == 401
