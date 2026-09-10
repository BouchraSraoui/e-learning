import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.progress.models import Enrollment

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='M', role=Role.ADMIN,
    )


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='R', role=Role.USER,
    )


@pytest.fixture
def catalog(db):
    cat = Category.objects.create(name='Commercial', accent='primary')
    published = Course.objects.create(
        title='Selling', summary='s', category=cat, is_published=True, is_mandatory=True,
    )
    Course.objects.create(title='Draft', summary='d', category=cat, is_published=False)
    module = Module.objects.create(course=published, title='M1', order=0)
    Lesson.objects.create(module=module, title='L1', content_type='video', order=0)
    return {'cat': cat, 'published': published}


def test_analytics_requires_staff(client, learner):
    client.force_authenticate(learner)
    assert client.get('/api/admin/analytics/').status_code == 403


def test_analytics_shapes(client, admin, learner, catalog):
    Enrollment.objects.create(
        user=learner, course=catalog['published'], status='in_progress', progress=40,
    )
    client.force_authenticate(admin)
    resp = client.get('/api/admin/analytics/')
    assert resp.status_code == 200
    data = resp.data

    assert data['users']['total'] == 2
    assert data['users']['by_role']['admin'] == 1
    assert data['users']['by_role']['user'] == 1

    assert data['courses']['total'] == 2
    assert data['courses']['published'] == 1
    assert data['courses']['draft'] == 1
    assert data['courses']['mandatory'] == 1

    assert data['enrollments']['total'] == 1
    assert data['enrollments']['in_progress'] == 1
    assert data['enrollments']['completion_rate'] == 0

    assert 'certificates' in data
    assert 'avg_quiz_score' in data
    assert any(c['slug'] == catalog['published'].slug for c in data['top_courses'])
    commercial = next(c for c in data['category_breakdown'] if c['name'] == 'Commercial')
    assert commercial['courses'] == 1
    assert commercial['enrollments'] == 1


def test_analytics_completion_rate(client, admin, learner, catalog):
    Enrollment.objects.create(
        user=learner, course=catalog['published'], status='completed', progress=100,
    )
    client.force_authenticate(admin)
    data = client.get('/api/admin/analytics/').data
    assert data['enrollments']['completion_rate'] == 100
    top = next(c for c in data['top_courses'] if c['slug'] == catalog['published'].slug)
    assert top['completion_rate'] == 100
