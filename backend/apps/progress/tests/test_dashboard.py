import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.progress.models import Assignment, Enrollment
from apps.progress.services import recompute_enrollment

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
def category(db):
    return Category.objects.create(name='Compliance', accent='amber')


def make_course(category, *, lessons=2, published=True, mandatory=False, title='Course', **kwargs):
    course = Course.objects.create(
        title=title, summary='s', category=category, level='beginner',
        primary_format='video', is_published=published, is_mandatory=mandatory, **kwargs,
    )
    module = Module.objects.create(course=course, title='M1', order=0)
    made = [
        Lesson.objects.create(
            module=module, title=f'L{i}', content_type='video', duration_minutes=10, order=i
        )
        for i in range(lessons)
    ]
    return course, made


def complete_lesson(client, lesson):
    return client.post(f'/api/lessons/{lesson.id}/progress/', {'completed': True}, format='json')



def test_dashboard_requires_auth(client):
    assert client.get('/api/dashboard/').status_code == 401


def test_dashboard_shape(client, learner, category):
    make_course(category, title='A')
    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.status_code == 200
    for key in ('stats', 'continue_learning', 'mandatory', 'assigned', 'recommendations', 'recent_certificates'):
        assert key in resp.data
    stats = resp.data['stats']
    for key in ('courses_in_progress', 'courses_completed', 'certificates', 'learning_hours', 'mandatory_remaining'):
        assert key in stats



def test_continue_learning_only_in_progress(client, learner, category):
    started, ls = make_course(category, lessons=2, title='Started')
    make_course(category, lessons=2, title='Untouched')
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': started.slug}, format='json')
    complete_lesson(client, ls[0])

    resp = client.get('/api/dashboard/')
    slugs = [e['course']['slug'] for e in resp.data['continue_learning']]
    assert slugs == [started.slug]
    assert resp.data['stats']['courses_in_progress'] == 1


def test_continue_learning_excludes_completed(client, learner, category):
    course, ls = make_course(category, lessons=1, title='Done')
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, ls[0])

    resp = client.get('/api/dashboard/')
    assert resp.data['continue_learning'] == []
    assert resp.data['stats']['courses_completed'] == 1



def test_mandatory_lists_incomplete_and_counts(client, learner, category):
    make_course(category, mandatory=True, title='Security Basics')
    optional, _ = make_course(category, mandatory=False, title='Optional')
    client.force_authenticate(learner)

    resp = client.get('/api/dashboard/')
    titles = [m['course']['title'] for m in resp.data['mandatory']]
    assert titles == ['Security Basics']
    assert resp.data['mandatory'][0]['status'] == 'not_started'
    assert resp.data['mandatory'][0]['enrolled'] is False
    assert resp.data['stats']['mandatory_remaining'] == 1
    assert optional.title not in titles


def test_completed_mandatory_drops_off(client, learner, category):
    course, ls = make_course(category, lessons=1, mandatory=True, title='Mandatory Done')
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, ls[0])

    resp = client.get('/api/dashboard/')
    assert resp.data['mandatory'] == []
    assert resp.data['stats']['mandatory_remaining'] == 0


def test_mandatory_draft_hidden(client, learner, category):
    make_course(category, mandatory=True, published=False, title='Draft Mandatory', slug='')
    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.data['mandatory'] == []



@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email='karim@gmail.com', password='password123',
        first_name='Karim', last_name='Bensalah', role=Role.MANAGER,
    )


def test_assigned_course_appears_on_dashboard(client, learner, manager, category):
    # A non-mandatory course, assigned by a manager, is otherwise invisible on
    # the dashboard (not in-progress, not mandatory, excluded from recos once
    # enrolled) — it must show up in the 'assigned' section.
    course, _ = make_course(category, mandatory=False, title='Assigned Course')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)
    Enrollment.objects.create(user=learner, course=course)

    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    titles = [a['course']['title'] for a in resp.data['assigned']]
    assert titles == ['Assigned Course']
    item = resp.data['assigned'][0]
    assert item['enrolled'] is True
    assert item['assigned_by'] == 'Karim Bensalah'
    # And it must NOT leak into recommendations
    assert 'Assigned Course' not in [c['title'] for c in resp.data['recommendations']]


def test_assigned_excludes_completed(client, learner, manager, category):
    course, ls = make_course(category, lessons=1, title='Assigned Done')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, ls[0])

    resp = client.get('/api/dashboard/')
    assert resp.data['assigned'] == []


def test_assigned_deduped_against_mandatory(client, learner, manager, category):
    # A mandatory course that is also assigned shows only under 'mandatory'.
    course, _ = make_course(category, mandatory=True, title='Mandatory And Assigned')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)
    client.force_authenticate(learner)

    resp = client.get('/api/dashboard/')
    assert [m['course']['title'] for m in resp.data['mandatory']] == ['Mandatory And Assigned']
    assert resp.data['assigned'] == []


def test_assigned_draft_hidden(client, learner, manager, category):
    course, _ = make_course(category, published=False, title='Assigned Draft', slug='')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)
    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.data['assigned'] == []


def test_recommendations_exclude_enrolled_and_mandatory(client, learner, category):
    enrolled, _ = make_course(category, title='Enrolled')
    make_course(category, mandatory=True, title='Mandatory')
    fresh, _ = make_course(category, title='Fresh')
    client.force_authenticate(learner)
    Enrollment.objects.create(user=learner, course=enrolled)

    resp = client.get('/api/dashboard/')
    titles = [c['title'] for c in resp.data['recommendations']]
    assert 'Fresh' in titles
    assert 'Enrolled' not in titles
    assert 'Mandatory' not in titles


def test_recommendations_hide_drafts(client, learner, category):
    make_course(category, published=False, title='Draft', slug='')
    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.data['recommendations'] == []



def test_recent_certificates_present(client, learner, category):
    course, ls = make_course(category, lessons=1)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, ls[0])

    resp = client.get('/api/dashboard/')
    assert len(resp.data['recent_certificates']) == 1
    assert resp.data['recent_certificates'][0]['course_title'] == course.title
    assert resp.data['stats']['certificates'] == 1


def test_dashboard_scoped_to_requesting_user(client, learner, category):
    other = User.objects.create_user(
        email='other@gmail.com', password='password123',
        first_name='Sara', last_name='Other', role=Role.USER,
    )
    course, _ = make_course(category)
    Enrollment.objects.create(user=other, course=course)
    recompute_enrollment(Enrollment.objects.get(user=other, course=course))

    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.data['continue_learning'] == []
    assert resp.data['stats']['courses_in_progress'] == 0


# --- manager team overview -------------------------------------------------


@pytest.fixture
def department(db):
    from apps.accounts.models import Department

    return Department.objects.create(name='Commercial')


def test_team_is_none_for_learner(client, learner, category):
    client.force_authenticate(learner)
    resp = client.get('/api/dashboard/')
    assert resp.data['team'] is None


def test_manager_sees_what_they_assigned(client, learner, manager, category):
    # The reviewer's report: a manager assigns a course and it shows up nowhere
    # on their own dashboard. The learner 'assigned' section only covers courses
    # assigned *to* you, so a manager needs their own team block.
    course, _ = make_course(category, title='Team Course')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)

    client.force_authenticate(manager)
    resp = client.get('/api/dashboard/')
    team = resp.data['team']
    assert team is not None
    assert [a['course']['title'] for a in team['assignments']] == ['Team Course']
    row = team['assignments'][0]
    assert row['user_name'] == 'Amir Rahmani'
    assert row['status'] == 'not_started'
    assert row['progress'] == 0
    assert team['counts'] == {
        'total': 1, 'not_started': 1, 'in_progress': 0, 'completed': 0, 'overdue': 0,
    }


def test_team_tracks_learner_progress(client, learner, manager, category):
    course, lessons = make_course(category, lessons=2, title='Tracked')
    Assignment.objects.create(user=learner, course=course, assigned_by=manager)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, lessons[0])

    client.force_authenticate(manager)
    team = client.get('/api/dashboard/').data['team']
    row = team['assignments'][0]
    assert row['status'] == 'in_progress'
    assert row['progress'] == 50
    assert team['counts']['in_progress'] == 1


def test_team_flags_overdue(client, learner, manager, category):
    from datetime import timedelta

    from django.utils import timezone

    course, _ = make_course(category, title='Late')
    Assignment.objects.create(
        user=learner, course=course, assigned_by=manager,
        due_date=timezone.localdate() - timedelta(days=1),
    )

    client.force_authenticate(manager)
    team = client.get('/api/dashboard/').data['team']
    assert team['assignments'][0]['overdue'] is True
    assert team['counts']['overdue'] == 1


def test_team_completed_is_not_overdue(client, learner, manager, category):
    from datetime import timedelta

    from django.utils import timezone

    course, lessons = make_course(category, lessons=1, title='Done Late')
    Assignment.objects.create(
        user=learner, course=course, assigned_by=manager,
        due_date=timezone.localdate() - timedelta(days=1),
    )
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    complete_lesson(client, lessons[0])

    client.force_authenticate(manager)
    team = client.get('/api/dashboard/').data['team']
    assert team['assignments'][0]['overdue'] is False
    assert team['counts']['overdue'] == 0
    assert team['counts']['completed'] == 1


def test_team_excludes_other_departments(client, learner, manager, category, department):
    # A manager with a department only sees that department's rows — mirrors the
    # assignments API scoping (both go through services.assignments_in_scope).
    from apps.accounts.models import Department

    manager.department = department
    manager.save(update_fields=['department'])
    learner.department = department
    learner.save(update_fields=['department'])

    outsider = User.objects.create_user(
        email='outsider@gmail.com', password='password123',
        first_name='Nadia', last_name='Other', role=Role.USER,
        department=Department.objects.create(name='Technique'),
    )
    mine, _ = make_course(category, title='Mine')
    theirs, _ = make_course(category, title='Theirs')
    Assignment.objects.create(user=learner, course=mine, assigned_by=manager)
    Assignment.objects.create(user=outsider, course=theirs, assigned_by=manager)

    client.force_authenticate(manager)
    team = client.get('/api/dashboard/').data['team']
    assert [a['course']['title'] for a in team['assignments']] == ['Mine']
    assert team['counts']['total'] == 1


def test_team_excludes_self_assignments(client, manager, category):
    # A course assigned to the manager themselves belongs in their learner
    # 'assigned' section, not in the team block (it would double-render).
    course, _ = make_course(category, title='Self')
    Assignment.objects.create(user=manager, course=course, assigned_by=manager)

    client.force_authenticate(manager)
    resp = client.get('/api/dashboard/')
    assert resp.data['team']['assignments'] == []
    assert [a['course']['title'] for a in resp.data['assigned']] == ['Self']
