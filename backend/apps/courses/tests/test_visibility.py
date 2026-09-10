"""A department-scoped course must only be listed for that department's members.

Everyone else — including accounts with no department at all — must not see it
in the catalog, course detail, category counts, learning paths, prerequisites,
dashboard or landing preview, and must not be able to enrol in it. An existing
enrolment (audience narrowing is additive) keeps the course reachable.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Department, Role, User
from apps.courses.models import Category, Course, LearningPath, LearningPathItem
from apps.progress.models import Enrollment

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def sales(db):
    return Department.objects.create(name='Sales')


@pytest.fixture
def support(db):
    return Department.objects.create(name='Support')


@pytest.fixture
def category(db):
    return Category.objects.create(name='Commercial', accent='primary')


@pytest.fixture
def sales_course(category, sales):
    return Course.objects.create(
        title='Sales only', summary='s', category=category, is_published=True,
        audience=Course.Audience.DEPARTMENT, department=sales,
    )


@pytest.fixture
def open_course(category):
    return Course.objects.create(
        title='Open to all', summary='s', category=category, is_published=True,
    )


def make_user(email, department=None, role=Role.USER):
    return User.objects.create_user(
        email=email, password='password123', first_name='T', last_name='U',
        role=role, department=department,
    )


def catalog_titles(client):
    return {c['title'] for c in client.get('/api/courses/').data['results']}


def test_no_department_user_cannot_list_department_course(client, sales_course, open_course):
    client.force_authenticate(make_user('nodept@gmail.com'))
    titles = catalog_titles(client)
    assert 'Sales only' not in titles
    assert 'Open to all' in titles


def test_other_department_user_cannot_list_department_course(client, sales_course, support):
    client.force_authenticate(make_user('support@gmail.com', department=support))
    assert 'Sales only' not in catalog_titles(client)


def test_department_member_sees_department_course(client, sales_course, sales):
    client.force_authenticate(make_user('sales@gmail.com', department=sales))
    assert 'Sales only' in catalog_titles(client)


def test_staff_see_department_course(client, sales_course):
    for email, role in (('m@gmail.com', Role.MANAGER), ('a@gmail.com', Role.ADMIN)):
        client.force_authenticate(make_user(email, role=role))
        assert 'Sales only' in catalog_titles(client)


def test_detail_404_for_out_of_scope_user(client, sales_course):
    client.force_authenticate(make_user('nodept@gmail.com'))
    assert client.get(f'/api/courses/{sales_course.slug}/').status_code == 404


def test_detail_ok_for_department_member(client, sales_course, sales):
    client.force_authenticate(make_user('sales@gmail.com', department=sales))
    assert client.get(f'/api/courses/{sales_course.slug}/').status_code == 200


def test_enrolled_out_of_scope_user_keeps_access(client, sales_course):
    """Audience narrowing keeps enrolments — the course must stay reachable."""
    user = make_user('enrolled@gmail.com')
    Enrollment.objects.create(user=user, course=sales_course)
    client.force_authenticate(user)
    assert 'Sales only' in catalog_titles(client)
    assert client.get(f'/api/courses/{sales_course.slug}/').status_code == 200


def test_out_of_scope_user_cannot_enroll(client, sales_course):
    client.force_authenticate(make_user('nodept@gmail.com'))
    resp = client.post('/api/enrollments/', {'course': sales_course.slug}, format='json')
    assert resp.status_code == 403
    assert not Enrollment.objects.filter(course=sales_course).exists()


def test_department_member_can_enroll(client, sales_course, sales):
    user = make_user('sales@gmail.com', department=sales)
    client.force_authenticate(user)
    resp = client.post('/api/enrollments/', {'course': sales_course.slug}, format='json')
    assert resp.status_code in (200, 201)
    assert Enrollment.objects.filter(user=user, course=sales_course).exists()


def test_category_count_excludes_department_course(client, sales_course, open_course, category):
    client.force_authenticate(make_user('nodept@gmail.com'))
    row = next(c for c in client.get('/api/categories/').data if c['name'] == 'Commercial')
    assert row['course_count'] == 1


def test_learning_path_hides_department_course(client, sales_course, open_course):
    path = LearningPath.objects.create(title='Track', is_published=True)
    LearningPathItem.objects.create(path=path, course=open_course, order=0)
    LearningPathItem.objects.create(path=path, course=sales_course, order=1)
    client.force_authenticate(make_user('nodept@gmail.com'))
    titles = {c['title'] for c in client.get(f'/api/learning-paths/{path.slug}/').data['courses']}
    assert 'Sales only' not in titles and 'Open to all' in titles


def test_prerequisites_hide_department_course(client, sales_course, open_course):
    open_course.prerequisites.add(sales_course)
    client.force_authenticate(make_user('nodept@gmail.com'))
    resp = client.get(f'/api/courses/{open_course.slug}/')
    assert [p['title'] for p in resp.data['prerequisites']] == []


def test_dashboard_hides_department_course(client, sales_course, sales):
    sales_course.is_mandatory = True
    sales_course.save()
    client.force_authenticate(make_user('nodept@gmail.com'))
    resp = client.get('/api/dashboard/')
    assert resp.status_code == 200
    titles = {item['course']['title'] for item in resp.data['mandatory']}
    titles |= {c['title'] for c in resp.data['recommendations']}
    assert 'Sales only' not in titles

    client.force_authenticate(make_user('sales@gmail.com', department=sales))
    resp = client.get('/api/dashboard/')
    titles = {item['course']['title'] for item in resp.data['mandatory']}
    assert 'Sales only' in titles


def test_landing_preview_excludes_department_course(client, sales_course, open_course):
    titles = {c['title'] for c in client.get('/api/courses/landing-preview/').data['courses']}
    assert 'Sales only' not in titles and 'Open to all' in titles


def test_feedback_endpoints_hidden_for_out_of_scope_user(client, sales_course, sales):
    client.force_authenticate(make_user('nodept@gmail.com'))
    assert client.get(f'/api/courses/{sales_course.slug}/feedback/').status_code == 404
    resp = client.post(
        f'/api/courses/{sales_course.slug}/feedback/',
        {'rating': 5, 'comment': 'x'}, format='json',
    )
    assert resp.status_code == 404

    client.force_authenticate(make_user('sales@gmail.com', department=sales))
    assert client.get(f'/api/courses/{sales_course.slug}/feedback/').status_code == 200
