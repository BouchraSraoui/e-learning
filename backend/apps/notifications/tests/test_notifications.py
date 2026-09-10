import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.courses.models import Category, Course, Lesson, Module
from apps.engagement.models import Comment
from apps.engagement.services import sync_badge_catalog
from apps.notifications.models import Notification, NotificationType
from apps.notifications.services import create_notification
from apps.notifications.tasks import send_inactivity_reminders, send_mandatory_reminders
from apps.progress.models import Enrollment, EnrollmentStatus, LessonProgress
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
def trainer(db):
    return User.objects.create_user(
        email='yasmine@gmail.com', password='password123',
        first_name='Yasmine', last_name='Belkacem', role=Role.MANAGER,
    )


@pytest.fixture
def category(db):
    return Category.objects.create(name='Commercial', accent='primary')


def make_course(category, *, lessons=2, mandatory=False, title='Course', **kwargs):
    course = Course.objects.create(
        title=title, summary='s', category=category, level='beginner',
        primary_format='video', is_published=True, is_mandatory=mandatory, **kwargs,
    )
    module = Module.objects.create(course=course, title='M1', order=0)
    made = [
        Lesson.objects.create(module=module, title=f'L{i}', content_type='video',
                              duration_minutes=10, order=i)
        for i in range(lessons)
    ]
    return course, made



def test_enrollment_creates_notification(learner, category):
    course, _ = make_course(category)
    Enrollment.objects.create(user=learner, course=course)
    assert Notification.objects.filter(
        recipient=learner, type=NotificationType.ENROLLMENT
    ).count() == 1


def test_completion_creates_certificate_notification(learner, category):
    course, lessons = make_course(category, lessons=1)
    enr = Enrollment.objects.create(user=learner, course=course)
    LessonProgress.objects.create(enrollment=enr, lesson=lessons[0], completed=True)
    recompute_enrollment(enr)
    assert Notification.objects.filter(
        recipient=learner, type=NotificationType.CERTIFICATE
    ).exists()


def test_badge_earned_creates_notification(learner, category):
    sync_badge_catalog()
    course, lessons = make_course(category, lessons=1)
    enr = Enrollment.objects.create(user=learner, course=course)
    LessonProgress.objects.create(enrollment=enr, lesson=lessons[0], completed=True)
    recompute_enrollment(enr)
    assert Notification.objects.filter(
        recipient=learner, type=NotificationType.BADGE
    ).exists()


def test_comment_reply_notifies_author_and_emails(learner, trainer, category):
    course, _ = make_course(category)
    parent = Comment.objects.create(course=course, author=trainer, body='Ask here')
    mail.outbox.clear()
    Comment.objects.create(course=course, author=learner, parent=parent, body='A question')
    note = Notification.objects.filter(
        recipient=trainer, type=NotificationType.COMMENT_REPLY
    ).first()
    assert note is not None
    assert any(m.to == [trainer.email] for m in mail.outbox)


def test_no_self_notification_on_own_reply(learner, category):
    course, _ = make_course(category)
    parent = Comment.objects.create(course=course, author=learner, body='mine')
    Comment.objects.create(course=course, author=learner, parent=parent, body='reply to self')
    assert not Notification.objects.filter(
        recipient=learner, type=NotificationType.COMMENT_REPLY
    ).exists()



def test_list_unread_and_mark_read(client, learner):
    create_notification(learner, NotificationType.BADGE, 'One')
    n2 = create_notification(learner, NotificationType.BADGE, 'Two')
    client.force_authenticate(learner)

    listing = client.get('/api/notifications/')
    assert listing.status_code == 200 and listing.data['count'] == 2

    unread = client.get('/api/notifications/unread-count/')
    assert unread.data['count'] == 2

    read = client.post(f'/api/notifications/{n2.id}/read/')
    assert read.status_code == 200 and read.data['is_read'] is True
    assert client.get('/api/notifications/unread-count/').data['count'] == 1

    filtered = client.get('/api/notifications/', {'unread': 'true'})
    assert filtered.data['count'] == 1


def test_mark_all_read(client, learner):
    create_notification(learner, NotificationType.BADGE, 'One')
    create_notification(learner, NotificationType.BADGE, 'Two')
    client.force_authenticate(learner)
    resp = client.post('/api/notifications/read-all/')
    assert resp.status_code == 200 and resp.data['updated'] == 2
    assert client.get('/api/notifications/unread-count/').data['count'] == 0


def test_cannot_read_others_notification(client, learner, trainer):
    n = create_notification(trainer, NotificationType.BADGE, 'Private')
    client.force_authenticate(learner)
    resp = client.post(f'/api/notifications/{n.id}/read/')
    assert resp.status_code == 404



def test_inactivity_reminder(learner, category):
    course, _ = make_course(category)
    Enrollment.objects.create(user=learner, course=course, status=EnrollmentStatus.IN_PROGRESS)
    mail.outbox.clear()
    sent = send_inactivity_reminders()
    assert sent == 1
    assert Notification.objects.filter(recipient=learner, type=NotificationType.REMINDER).exists()
    assert any(m.to == [learner.email] for m in mail.outbox)


def test_inactivity_reminder_dedupes(learner, category):
    course, _ = make_course(category)
    Enrollment.objects.create(user=learner, course=course, status=EnrollmentStatus.IN_PROGRESS)
    assert send_inactivity_reminders() == 1
    assert send_inactivity_reminders() == 0


def test_mandatory_reminder(learner, category):
    make_course(category, mandatory=True, title='Compliance 101')
    sent = send_mandatory_reminders()
    assert sent == 1
    assert Notification.objects.filter(recipient=learner, type=NotificationType.DEADLINE).exists()


def test_email_respects_preference(learner):
    learner.email_notifications = False
    learner.save(update_fields=['email_notifications'])
    mail.outbox.clear()
    create_notification(learner, NotificationType.REMINDER, 'Hi', email=True)
    assert len(mail.outbox) == 0
