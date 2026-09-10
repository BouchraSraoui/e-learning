import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.progress.models import Certificate, Enrollment, LessonProgress
from apps.progress.services import issue_certificate, recompute_enrollment

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
def trainer(db):
    return User.objects.create_user(
        email='manager@gmail.com', password='password123',
        first_name='Yasmine', last_name='Belkacem', role=Role.MANAGER,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Compliance', accent='amber')


def make_course(category, *, lessons=2, published=True, title='Course', **kwargs):
    course = Course.objects.create(
        title=title, summary='s', category=category, level='beginner',
        primary_format='video', is_published=published, **kwargs,
    )
    module = Module.objects.create(course=course, title='M1', order=0)
    made = [
        Lesson.objects.create(
            module=module, title=f'L{i}', content_type='video', duration_minutes=10, order=i
        )
        for i in range(lessons)
    ]
    return course, made



def test_enroll_requires_auth(client, category):
    course, _ = make_course(category)
    assert client.post('/api/enrollments/', {'course': course.slug}, format='json').status_code == 401


def test_learner_enrolls(client, learner, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    resp = client.post('/api/enrollments/', {'course': course.slug}, format='json')
    assert resp.status_code == 201
    assert Enrollment.objects.filter(user=learner, course=course).count() == 1


def test_enroll_is_idempotent(client, learner, category):
    course, _ = make_course(category)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    resp = client.post('/api/enrollments/', {'course': course.slug}, format='json')
    assert resp.status_code == 200
    assert Enrollment.objects.filter(user=learner, course=course).count() == 1


def test_cannot_enroll_in_draft(client, learner, category):
    course, _ = make_course(category, published=False, title='Draft', slug='')
    client.force_authenticate(learner)
    resp = client.post('/api/enrollments/', {'course': course.slug}, format='json')
    assert resp.status_code == 400


def test_my_enrollments_scoped_to_user(client, learner, trainer, category):
    course, _ = make_course(category)
    Enrollment.objects.create(user=learner, course=course)
    Enrollment.objects.create(user=trainer, course=course)
    client.force_authenticate(learner)
    resp = client.get('/api/enrollments/')
    assert resp.status_code == 200 and len(resp.data) == 1


def test_enrollment_detail_by_slug(client, learner, category):
    course, _ = make_course(category)
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/enrollments/{course.slug}/')
    assert resp.status_code == 200
    assert resp.data['course']['slug'] == course.slug



def test_progress_requires_enrollment(client, learner, category):
    course, ls = make_course(category)
    client.force_authenticate(learner)
    resp = client.post(f'/api/lessons/{ls[0].id}/progress/', {'completed': True}, format='json')
    assert resp.status_code == 403


def test_progress_updates_percent_and_status(client, learner, category):
    course, ls = make_course(category, lessons=2)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')

    resp = client.post(f'/api/lessons/{ls[0].id}/progress/', {'completed': True}, format='json')
    assert resp.status_code == 200
    assert resp.data['progress'] == 50 and resp.data['status'] == 'in_progress'

    resp = client.post(f'/api/lessons/{ls[1].id}/progress/', {'completed': True}, format='json')
    assert resp.data['progress'] == 100 and resp.data['status'] == 'completed'


def test_time_spent_accumulates_and_resume_overwrites(client, learner, category):
    course, ls = make_course(category)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    client.post(f'/api/lessons/{ls[0].id}/progress/', {'time_spent_seconds': 30}, format='json')
    client.post(
        f'/api/lessons/{ls[0].id}/progress/',
        {'time_spent_seconds': 45, 'resume_position_seconds': 120}, format='json',
    )
    lp = LessonProgress.objects.get(lesson=ls[0], enrollment__user=learner)
    assert lp.time_spent_seconds == 75 and lp.resume_position_seconds == 120


def test_completion_updates_user_stats(client, learner, category):
    course, ls = make_course(category, lessons=1)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    client.post(f'/api/lessons/{ls[0].id}/progress/', {'completed': True}, format='json')
    learner.refresh_from_db()
    assert learner.courses_completed == 1
    assert learner.certificates_count == 1
    assert learner.learning_minutes == 10



def _with_file(lesson, data=b'0123456789' * 10):
    lesson.file = SimpleUploadedFile('clip.mp4', data, content_type='video/mp4')
    lesson.save()
    return lesson


def test_media_requires_auth(client, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0])
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 401


def test_media_gated_until_enrolled(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0])
    lesson.is_preview = False
    lesson.save()
    client.force_authenticate(learner)
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 403
    Enrollment.objects.create(user=learner, course=course)
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 200


def test_media_range_returns_206(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0])
    Enrollment.objects.create(user=learner, course=course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/lessons/{lesson.id}/media/', HTTP_RANGE='bytes=0-9')
    assert resp.status_code == 206
    assert resp['Content-Range'] == 'bytes 0-9/100'
    assert resp['Content-Length'] == '10'
    assert b''.join(resp.streaming_content) == b'0123456789'


def test_media_token_query_param(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category)
    lesson = _with_file(ls[0], b'x' * 50)
    Enrollment.objects.create(user=learner, course=course)
    token = str(RefreshToken.for_user(learner).access_token)
    resp = client.get(f'/api/lessons/{lesson.id}/media/?token={token}')
    assert resp.status_code == 200


def test_course_detail_unlocks_media_when_enrolled(client, learner, category):
    course, ls = make_course(category)
    lesson = ls[0]
    lesson.is_preview = False
    lesson.external_url = 'https://cdn.example.com/v.mp4'
    lesson.save()
    client.force_authenticate(learner)
    resp = client.get(f'/api/courses/{course.slug}/')
    assert resp.data['modules'][0]['lessons'][0]['external_url'] == ''

    Enrollment.objects.create(user=learner, course=course)
    resp = client.get(f'/api/courses/{course.slug}/')
    assert resp.data['modules'][0]['lessons'][0]['external_url'] == 'https://cdn.example.com/v.mp4'



def test_certificate_issued_on_full_completion(client, learner, category):
    course, ls = make_course(category, lessons=1)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    client.post(f'/api/lessons/{ls[0].id}/progress/', {'completed': True}, format='json')
    cert = Certificate.objects.filter(user=learner, course=course).first()
    assert cert is not None and cert.is_valid


def test_no_certificate_when_course_disables_it(client, learner, category):
    course, ls = make_course(category, lessons=1, issues_certificate=False)
    client.force_authenticate(learner)
    client.post('/api/enrollments/', {'course': course.slug}, format='json')
    client.post(f'/api/lessons/{ls[0].id}/progress/', {'completed': True}, format='json')
    enrollment = Enrollment.objects.get(user=learner, course=course)
    assert enrollment.status == 'completed'
    assert not Certificate.objects.filter(user=learner, course=course).exists()


def test_signature_tamper_detected(learner, category):
    course, _ = make_course(category)
    cert = issue_certificate(learner, course)
    assert cert.is_valid
    Certificate.objects.filter(pk=cert.pk).update(holder_name='Mallory')
    cert.refresh_from_db()
    assert not cert.is_valid


def test_verify_public_valid(client, learner, category):
    course, _ = make_course(category)
    cert = issue_certificate(learner, course)
    resp = client.get(f'/api/verify/{cert.code}/')
    assert resp.status_code == 200
    assert resp.data['valid'] is True
    assert resp.data['holder_name'] == learner.full_name


def test_verify_unknown_code(client):
    resp = client.get('/api/verify/ICO-0000-0000/')
    assert resp.status_code == 404 and resp.data['valid'] is False


def test_certificate_list_mine(client, learner, category):
    course, _ = make_course(category)
    issue_certificate(learner, course)
    client.force_authenticate(learner)
    resp = client.get('/api/certificates/')
    assert resp.status_code == 200 and len(resp.data) == 1


def test_certificate_download_pdf(client, learner, category):
    course, _ = make_course(category)
    cert = issue_certificate(learner, course)
    client.force_authenticate(learner)
    resp = client.get(f'/api/certificates/{cert.code}/download/')
    assert resp.status_code == 200
    assert resp['Content-Type'] == 'application/pdf'
    assert resp.content[:4] == b'%PDF'


def test_certificate_download_forbidden_for_other_learner(client, learner, category):
    course, _ = make_course(category)
    cert = issue_certificate(learner, course)
    other = User.objects.create_user(
        email='mallory@gmail.com', password='password123',
        first_name='Mal', last_name='Ory', role=Role.USER,
    )
    client.force_authenticate(other)
    resp = client.get(f'/api/certificates/{cert.code}/download/')
    assert resp.status_code == 403


def test_certificate_not_issued_until_all_steps_done(client, learner, category):
    course = Course.objects.create(
        title='Big', summary='s', category=category, level='beginner', is_published=True
    )
    module = Module.objects.create(course=course, title='M', order=0)
    Lesson.objects.bulk_create(
        [
            Lesson(module=module, title=f'L{i}', content_type='video', duration_minutes=1, order=i)
            for i in range(200)
        ]
    )
    lessons = list(Lesson.objects.filter(module=module).order_by('order'))
    enrollment = Enrollment.objects.create(user=learner, course=course)
    LessonProgress.objects.bulk_create(
        [LessonProgress(enrollment=enrollment, lesson=lessons[i], completed=True) for i in range(199)]
    )
    recompute_enrollment(enrollment)
    enrollment.refresh_from_db()
    assert enrollment.progress == 99
    assert enrollment.status == 'in_progress'
    assert not Certificate.objects.filter(user=learner, course=course).exists()

    LessonProgress.objects.create(enrollment=enrollment, lesson=lessons[199], completed=True)
    recompute_enrollment(enrollment)
    enrollment.refresh_from_db()
    assert enrollment.progress == 100 and enrollment.status == 'completed'
    assert Certificate.objects.filter(user=learner, course=course).exists()


def test_media_denied_for_draft_course_preview_lesson(client, learner, category, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    course, ls = make_course(category, published=False, title='Draft', slug='')
    lesson = _with_file(ls[0])
    lesson.is_preview = True
    lesson.save()
    client.force_authenticate(learner)
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 403

    staff = User.objects.create_user(
        email='tr2@gmail.com', password='password123',
        first_name='Tara', last_name='Ret', role=Role.MANAGER,
    )
    client.force_authenticate(staff)
    assert client.get(f'/api/lessons/{lesson.id}/media/').status_code == 200


def test_manager_notified_on_issue(learner, category):
    manager = User.objects.create_user(
        email='mgr@gmail.com', password='password123',
        first_name='Karim', last_name='Haddad', role=Role.MANAGER,
    )
    learner.manager = manager
    learner.save(update_fields=['manager'])
    course, _ = make_course(category)
    mail.outbox.clear()
    issue_certificate(learner, course)
    assert len(mail.outbox) == 1
    assert learner.email in mail.outbox[0].to
    assert manager.email in mail.outbox[0].to
