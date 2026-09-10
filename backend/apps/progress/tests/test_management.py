import csv
import io

import pytest
from rest_framework.test import APIClient

from apps.accounts.audit import record_audit
from apps.accounts.models import AuditLog, Department, Role, User
from apps.courses.models import Category, Course
from apps.progress.models import Assignment, Enrollment

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def dept_a(db):
    return Department.objects.create(name='Commercial')


@pytest.fixture
def dept_b(db):
    return Department.objects.create(name='Technical')


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Sofia', last_name='M', role=Role.ADMIN,
    )


@pytest.fixture
def manager(dept_a):
    return User.objects.create_user(
        email='manager@gmail.com', password='password123',
        first_name='Karim', last_name='H', role=Role.MANAGER, department=dept_a,
    )


@pytest.fixture
def learner_a(dept_a):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='R', role=Role.USER, department=dept_a,
    )


@pytest.fixture
def learner_b(dept_b):
    return User.objects.create_user(
        email='other@gmail.com', password='password123',
        first_name='Other', last_name='O', role=Role.USER, department=dept_b,
    )


@pytest.fixture
def course(db):
    cat = Category.objects.create(name='Commercial', accent='primary')
    return Course.objects.create(title='Selling', summary='s', category=cat, is_published=True)



def test_manager_assigns_course_and_enrolls(client, manager, learner_a, course):
    client.force_authenticate(manager)
    resp = client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    assert resp.status_code == 201, resp.data
    assert Assignment.objects.filter(user=learner_a, course=course).exists()
    assert Enrollment.objects.filter(user=learner_a, course=course).exists()


def test_learner_cannot_assign(client, learner_a, course):
    client.force_authenticate(learner_a)
    resp = client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    assert resp.status_code == 403


def test_manager_cannot_assign_outside_department(client, manager, learner_b, course):
    client.force_authenticate(manager)
    resp = client.post('/api/assignments/', {'user': learner_b.id, 'course': course.id}, format='json')
    assert resp.status_code == 403
    assert resp.data['code'] == 'out_of_scope'


def test_reassigning_updates_due_date(client, manager, learner_a, course):
    client.force_authenticate(manager)
    client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    resp = client.post(
        '/api/assignments/',
        {'user': learner_a.id, 'course': course.id, 'due_date': '2026-12-31'},
        format='json',
    )
    assert resp.status_code == 200
    assert Assignment.objects.filter(user=learner_a, course=course).count() == 1


def test_assignment_has_no_update_route(client, manager, learner_a, course):
    a = Assignment.objects.create(user=learner_a, course=course, assigned_by=manager)
    client.force_authenticate(manager)
    assert client.patch(f'/api/assignments/{a.id}/', {'note': 'x'}, format='json').status_code == 405
    assert client.put(f'/api/assignments/{a.id}/', {'user': learner_a.id, 'course': course.id}, format='json').status_code == 405


def test_reassign_response_reflects_existing_progress(client, manager, learner_a, course):
    client.force_authenticate(manager)
    client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    Enrollment.objects.filter(user=learner_a, course=course).update(status='in_progress', progress=55)
    resp = client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    assert resp.status_code == 200
    assert resp.data['status'] == 'in_progress'
    assert resp.data['progress'] == 55


def test_learner_sees_own_assignment(client, manager, learner_a, course):
    Assignment.objects.create(user=learner_a, course=course, assigned_by=manager)
    client.force_authenticate(learner_a)
    resp = client.get('/api/assignments/')
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]['course']['slug'] == course.slug


def test_manager_scopes_assignment_list(client, manager, learner_a, learner_b, course):
    Assignment.objects.create(user=learner_a, course=course, assigned_by=manager)
    Assignment.objects.create(user=learner_b, course=course)
    client.force_authenticate(manager)
    resp = client.get('/api/assignments/')
    emails = {a['user_email'] for a in resp.data}
    assert emails == {learner_a.email}



def test_report_scoped_to_manager_department(client, manager, learner_a, learner_b, course):
    Enrollment.objects.create(user=learner_a, course=course, status='in_progress', progress=40)
    Enrollment.objects.create(user=learner_b, course=course, status='completed', progress=100)
    client.force_authenticate(manager)
    resp = client.get('/api/admin/reports/')
    assert resp.status_code == 200
    emails = {r['user_email'] for r in resp.data['rows']}
    assert emails == {learner_a.email}


def test_admin_report_sees_all_and_filters_status(client, admin, learner_a, learner_b, course):
    Enrollment.objects.create(user=learner_a, course=course, status='in_progress', progress=40)
    Enrollment.objects.create(user=learner_b, course=course, status='completed', progress=100)
    client.force_authenticate(admin)
    assert client.get('/api/admin/reports/').data['count'] == 2
    filtered = client.get('/api/admin/reports/?status=completed')
    assert filtered.data['count'] == 1
    assert filtered.data['rows'][0]['user_email'] == learner_b.email


def test_learner_cannot_report(client, learner_a):
    client.force_authenticate(learner_a)
    assert client.get('/api/admin/reports/').status_code == 403


def test_report_ignores_malformed_filters(client, admin, learner_a, course):
    Enrollment.objects.create(user=learner_a, course=course, status='in_progress', progress=40)
    client.force_authenticate(admin)
    assert client.get('/api/admin/reports/?date_from=notadate').status_code == 200
    assert client.get('/api/admin/reports/?department=abc').status_code == 200
    assert client.get('/api/admin/reports/export/?fmt=csv&date_to=xx').status_code == 200


def test_report_export_csv(client, admin, learner_a, course):
    Enrollment.objects.create(user=learner_a, course=course, status='in_progress', progress=40)
    client.force_authenticate(admin)
    resp = client.get('/api/admin/reports/export/?fmt=csv')
    assert resp.status_code == 200
    assert resp['Content-Disposition'].startswith('attachment')
    text = resp.content.decode('utf-8-sig')
    rows = list(csv.DictReader(io.StringIO(text)))
    assert any(r['user_email'] == learner_a.email for r in rows)


def test_report_export_xlsx_and_pdf(client, admin, learner_a, course):
    Enrollment.objects.create(user=learner_a, course=course, status='completed', progress=100)
    client.force_authenticate(admin)
    xlsx = client.get('/api/admin/reports/export/?fmt=xlsx')
    assert xlsx.status_code == 200 and xlsx.content[:2] == b'PK'
    pdf = client.get('/api/admin/reports/export/?fmt=pdf')
    assert pdf.status_code == 200 and pdf.content[:4] == b'%PDF'



def test_admin_user_create_writes_audit(client, admin, dept_a):
    client.force_authenticate(admin)
    client.post('/api/admin/users/', {
        'email': 'new@gmail.com', 'first_name': 'New', 'last_name': 'User',
        'role': 'user', 'department': dept_a.id,
    }, format='json')
    log = AuditLog.objects.filter(action='user.create').first()
    assert log is not None
    assert log.actor_id == admin.id
    assert 'new@gmail.com' in log.target_repr


def test_assignment_create_writes_audit(client, manager, learner_a, course):
    client.force_authenticate(manager)
    client.post('/api/assignments/', {'user': learner_a.id, 'course': course.id}, format='json')
    assert AuditLog.objects.filter(action='assignment.create').exists()


def test_admin_lists_audit_log(client, admin):
    record_audit(admin, 'user.update', target_repr='someone@gmail.com')
    client.force_authenticate(admin)
    resp = client.get('/api/admin/audit/')
    assert resp.status_code == 200
    assert resp.data['count'] >= 1
    assert resp.data['results'][0]['action'] == 'user.update'


def test_learner_cannot_read_audit(client, learner_a):
    client.force_authenticate(learner_a)
    assert client.get('/api/admin/audit/').status_code == 403


def test_record_audit_never_raises_on_bad_actor():
    log = record_audit(None, 'system.tick', target_repr='ok')
    assert log is not None
    assert log.actor_id is None
