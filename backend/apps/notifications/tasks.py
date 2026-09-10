from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_notification_email(notification_id: int):
    from .models import Notification

    n = Notification.objects.select_related('recipient').filter(id=notification_id).first()
    if not n or not n.recipient.email:
        return
    url = f'{settings.FRONTEND_URL}{n.url or "/dashboard"}'
    body = f'{n.body}\n\n{url}' if n.body else url
    send_mail(
        subject=n.title,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[n.recipient.email],
        fail_silently=True,
    )


@shared_task
def send_inactivity_reminders(idle_days: int = 7) -> int:
    from datetime import timedelta

    from django.db.models import Q
    from django.utils import timezone

    from apps.accounts.models import User
    from apps.progress.models import Enrollment, EnrollmentStatus

    from .models import NotificationType
    from .services import create_notification

    cutoff = timezone.localdate() - timedelta(days=idle_days)
    learners = User.objects.filter(is_active=True).filter(
        Q(last_activity_date__lt=cutoff) | Q(last_activity_date__isnull=True)
    )
    sent = 0
    for user in learners:
        if Enrollment.objects.filter(user=user, status=EnrollmentStatus.IN_PROGRESS).exists():
            created = create_notification(
                user,
                NotificationType.REMINDER,
                'Pick up where you left off',
                'You have courses in progress — keep your streak going!',
                '/my-learning',
                email=True,
                dedupe=True,
            )
            if created:
                sent += 1
    return sent


@shared_task
def send_mandatory_reminders() -> int:
    from apps.accounts.models import User
    from apps.courses.models import Course
    from apps.progress.models import Enrollment, EnrollmentStatus

    from .models import NotificationType
    from .services import create_notification

    mandatory = list(Course.objects.filter(is_published=True, is_mandatory=True))
    sent = 0
    for user in User.objects.filter(is_active=True):
        for course in mandatory:
            enr = Enrollment.objects.filter(user=user, course=course).first()
            if enr and enr.status == EnrollmentStatus.COMPLETED:
                continue
            created = create_notification(
                user,
                NotificationType.DEADLINE,
                f'Required training: {course.title}',
                'This course is mandatory. Please complete it soon.',
                f'/catalog/{course.slug}',
                email=True,
                dedupe=True,
            )
            if created:
                sent += 1
    return sent
