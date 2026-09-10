"""Off-net enforcement tests (spec 2.6.2): internal-only courses, the admin console,
and download blocking.

On-net is the default under test settings (loopback REMOTE_ADDR is in NET_ONNET_CIDRS,
see config/settings/test.py). A request is made *off-net* by sending a non-loopback
REMOTE_ADDR — the ``OFF_NET`` extra below.
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.progress.models import Enrollment
from apps.progress.services import issue_certificate

pytestmark = pytest.mark.django_db

OFF_NET = {'REMOTE_ADDR': '203.0.113.7'}  # outside the loopback on-net range


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        email='admin@gmail.com', password='password123',
        first_name='Ada', last_name='Min', role=Role.ADMIN,
    )


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email='mgr@gmail.com', password='password123',
        first_name='Mo', last_name='Ger', role=Role.MANAGER,
    )


@pytest.fixture
def learner(db):
    return User.objects.create_user(
        email='amir@gmail.com', password='password123',
        first_name='Amir', last_name='Rahmani', role=Role.USER,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Compliance', accent='amber')


def make_course(category, *, internal_only=False, lessons=1, title='Course'):
    course = Course.objects.create(
        title=title, summary='s', category=category, level='beginner',
        primary_format='video', is_published=True, internal_only=internal_only,
    )
    module = Module.objects.create(course=course, title='M1', order=0)
    made = [
        Lesson.objects.create(
            module=module, title=f'L{i}', content_type='video',
            duration_minutes=10, order=i,
        )
        for i in range(lessons)
    ]
    return course, made


def _with_file(lesson, data=b'0123456789' * 5):
    lesson.file = SimpleUploadedFile('clip.mp4', data, content_type='video/mp4')
    lesson.save()
    return lesson


# --- (B) admin / management console on-net only ----------------------------

def test_admin_users_on_net_ok(client, admin):
    client.force_authenticate(admin)
    assert client.get('/api/admin/users/').status_code == 200


def test_admin_users_off_net_denied(client, admin):
    client.force_authenticate(admin)
    assert client.get('/api/admin/users/', **OFF_NET).status_code == 403


def test_authoring_off_net_denied(client, manager):
    # ModuleViewSet GET is gated by IsCourseAuthorOrAdmin (the authoring console).
    client.force_authenticate(manager)
    assert client.get('/api/modules/').status_code == 200
    assert client.get('/api/modules/', **OFF_NET).status_code == 403


def test_course_create_off_net_denied(client, manager, category):
    client.force_authenticate(manager)
    payload = {'title': 'New', 'summary': 's', 'category': category.id}
    assert client.post('/api/courses/', payload, format='json', **OFF_NET).status_code == 403
    assert client.post('/api/courses/', payload, format='json').status_code == 201


def test_learner_browsing_unaffected_off_net(client, learner, category):
    make_course(category)
    client.force_authenticate(learner)
    assert client.get('/api/courses/', **OFF_NET).status_code == 200


# --- (A) internal-only courses lock off-net --------------------------------

def test_internal_enroll_blocked_off_net(client, learner, category):
    course, _ = make_course(category, internal_only=True)
    client.force_authenticate(learner)
    off = client.post('/api/enrollments/', {'course': course.slug}, format='json', **OFF_NET)
    assert off.status_code == 403 and off.data.get('code') == 'internal_off_net'
    assert client.post('/api/enrollments/', {'course': course.slug}, format='json').status_code == 201


def test_internal_content_masked_off_net(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category, internal_only=True)
    _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    on = client.get(f'/api/courses/{course.slug}/')
    assert on.data['modules'][0]['lessons'][0]['file']  # enrolled learner sees media on-net
    off = client.get(f'/api/courses/{course.slug}/', **OFF_NET)
    assert off.data['modules'][0]['lessons'][0]['file'] is None  # masked off-net


def test_internal_media_blocked_off_net(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category, internal_only=True)
    lesson = _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 200
    off = client.get(f'/api/lessons/{lesson.id}/media/', **OFF_NET)
    assert off.status_code == 403 and off.data.get('code') == 'internal_off_net'


def test_normal_course_media_viewable_off_net(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category, internal_only=False)
    lesson = _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    # Inline viewing of a normal course stays available off-net.
    assert client.get(f'/api/lessons/{lesson.id}/media/', **OFF_NET).status_code == 200


# --- (C) downloads blocked off-net (inline view + certificates stay) -------

def test_download_blocked_off_net(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    off = client.get(f'/api/lessons/{lesson.id}/media/?download=1', **OFF_NET)
    assert off.status_code == 403 and off.data.get('code') == 'download_off_net'


def test_download_on_net_sets_attachment(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/lessons/{lesson.id}/media/?download=1')
    assert resp.status_code == 200
    assert 'attachment' in resp['Content-Disposition']


def test_certificate_download_works_off_net(client, learner, category):
    course, _ = make_course(category)
    cert = issue_certificate(learner, course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/certificates/{cert.code}/download/', **OFF_NET)
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'application/pdf'
