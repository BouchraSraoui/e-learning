import csv
import io

import pytest
from rest_framework.test import APIClient

from apps.accounts.bulk import build_export, run_import
from apps.accounts.models import Department, Role, Team, User

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
def commercial(db):
    return Department.objects.create(name='Commercial')


class _Upload(io.BytesIO):

    def __init__(self, content: bytes, name: str):
        super().__init__(content)
        self.name = name
        self.size = len(content)


def _csv_upload(rows: list[dict], name='import.csv') -> _Upload:
    headers: list[str] = []
    for row in rows:
        for key in row:
            if key not in headers:
                headers.append(key)
    headers = headers or ['email']
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers, restval='')
    writer.writeheader()
    writer.writerows(rows)
    return _Upload(buf.getvalue().encode('utf-8'), name)



def test_export_csv_roundtrips_columns(admin, commercial):
    user = User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
        department=commercial,
    )
    content, content_type, filename = build_export(User.objects.all(), 'csv')
    assert filename == 'users.csv'
    assert 'csv' in content_type
    text = content.decode('utf-8-sig')
    reader = list(csv.DictReader(io.StringIO(text)))
    row = next(r for r in reader if r['email'] == 'amir@gmail.com')
    assert row['first_name'] == 'Amir'
    assert row['role'] == 'user'
    assert row['department'] == 'Commercial'
    assert row['is_active'] == 'true'


def test_export_xlsx_is_a_workbook(admin):
    content, content_type, filename = build_export(User.objects.all(), 'xlsx')
    assert filename == 'users.xlsx'
    assert 'spreadsheetml' in content_type
    assert content[:2] == b'PK'


def test_export_endpoint_admin_only(client, admin):
    client.force_authenticate(admin)
    resp = client.get('/api/admin/users/export/?fmt=csv')
    assert resp.status_code == 200
    assert resp['Content-Disposition'].startswith('attachment')


def test_export_endpoint_forbidden_for_learner(client):
    learner = User.objects.create_user(
        email='l@gmail.com', password='password123',
        first_name='Lina', last_name='K', role=Role.USER,
    )
    client.force_authenticate(learner)
    assert client.get('/api/admin/users/export/').status_code == 403


def test_export_respects_filter(client, admin, commercial):
    User.objects.create_user(
        email='manager@gmail.com', password='password123',
        first_name='Nadia', last_name='S', role=Role.MANAGER,
    )
    client.force_authenticate(admin)
    resp = client.get('/api/admin/users/export/?role=manager')
    text = resp.content.decode('utf-8-sig')
    emails = [r['email'] for r in csv.DictReader(io.StringIO(text))]
    assert emails == ['manager@gmail.com']



def test_import_creates_new_user(commercial):
    upload = _csv_upload([{
        'email': 'new@gmail.com', 'first_name': 'Amina', 'last_name': 'Benali',
        'role': 'user', 'department': 'Commercial', 'is_active': 'true',
    }])
    report = run_import(upload)
    assert report['created'] == 1
    assert report['updated'] == 0
    assert report['errors'] == []
    user = User.objects.get(email='new@gmail.com')
    assert user.first_name == 'Amina'
    assert user.department_id == commercial.id
    assert not user.has_usable_password()


def test_import_updates_existing_user_by_email():
    User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )
    upload = _csv_upload([{
        'email': 'AMIR@gmail.com', 'first_name': 'Amir', 'last_name': 'Rahmani',
        'role': 'manager', 'job_title': 'Lead',
    }])
    report = run_import(upload)
    assert report['updated'] == 1
    assert report['created'] == 0
    amir = User.objects.get(email='amir@gmail.com')
    assert amir.role == 'manager'
    assert amir.job_title == 'Lead'


def test_import_reports_bad_rows_without_aborting(commercial):
    upload = _csv_upload([
        {'email': 'good@gmail.com', 'first_name': 'Good', 'last_name': 'Row', 'role': 'user'},
        {'email': 'not-an-email', 'first_name': 'Bad', 'last_name': 'Row', 'role': 'user'},
        {'email': 'unknowndept@gmail.com', 'first_name': 'X', 'last_name': 'Y',
         'role': 'user', 'department': 'Nope'},
    ])
    report = run_import(upload)
    assert report['created'] == 1
    assert len(report['errors']) == 2
    assert {e['row'] for e in report['errors']} == {3, 4}
    assert User.objects.filter(email='good@gmail.com').exists()
    assert not User.objects.filter(email='unknowndept@gmail.com').exists()


def test_import_full_name_alias_splits(commercial):
    upload = _csv_upload([{
        'email': 'fn@gmail.com', 'full_name': 'Yacine Le Grand', 'role': 'user',
    }])
    report = run_import(upload)
    assert report['created'] == 1
    user = User.objects.get(email='fn@gmail.com')
    assert user.first_name == 'Yacine'
    assert user.last_name == 'Le Grand'


def test_import_team_must_belong_to_department():
    dep_a = Department.objects.create(name='Alpha')
    dep_b = Department.objects.create(name='Beta')
    Team.objects.create(name='Squad', department=dep_b)
    upload = _csv_upload([{
        'email': 'mismatch@gmail.com', 'first_name': 'M', 'last_name': 'M',
        'role': 'user', 'department': 'Alpha', 'team': 'Squad',
    }])
    report = run_import(upload)
    assert report['created'] == 0
    assert len(report['errors']) == 1
    assert 'not in department' in report['errors'][0]['messages'][0]


def test_import_manager_by_email_resolves_forward_reference():
    mgr = User.objects.create_user(
        email='mgr@gmail.com', password='password123',
        first_name='Mgr', last_name='One', role=Role.MANAGER,
    )
    upload = _csv_upload([{
        'email': 'report@gmail.com', 'first_name': 'R', 'last_name': 'R',
        'role': 'user', 'manager': 'mgr@gmail.com',
    }])
    report = run_import(upload)
    assert report['created'] == 1
    assert User.objects.get(email='report@gmail.com').manager_id == mgr.id


def test_import_endpoint_admin_only(client):
    learner = User.objects.create_user(
        email='l@gmail.com', password='password123',
        first_name='L', last_name='K', role=Role.USER,
    )
    client.force_authenticate(learner)
    upload = _csv_upload([{'email': 'x@gmail.com', 'first_name': 'X', 'role': 'user'}])
    resp = client.post('/api/admin/users/import/', {'file': upload}, format='multipart')
    assert resp.status_code == 403


def test_import_endpoint_returns_report(client, admin):
    client.force_authenticate(admin)
    upload = _csv_upload([{
        'email': 'viapi@gmail.com', 'first_name': 'Via', 'last_name': 'Api', 'role': 'user',
    }])
    resp = client.post('/api/admin/users/import/', {'file': upload}, format='multipart')
    assert resp.status_code == 200
    assert resp.data['created'] == 1
    assert User.objects.filter(email='viapi@gmail.com').exists()


def test_import_rejects_missing_file(client, admin):
    client.force_authenticate(admin)
    resp = client.post('/api/admin/users/import/', {}, format='multipart')
    assert resp.status_code == 400
    assert resp.data['code'] == 'no_file'


def test_import_template_download(client, admin):
    client.force_authenticate(admin)
    resp = client.get('/api/admin/users/import-template/?fmt=csv')
    assert resp.status_code == 200
    text = resp.content.decode('utf-8-sig')
    assert 'email' in text.splitlines()[0]
