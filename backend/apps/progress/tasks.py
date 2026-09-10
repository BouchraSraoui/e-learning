from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_certificate_notification(certificate_id: int):
    from .models import Certificate

    cert = Certificate.objects.select_related('user', 'user__manager').filter(id=certificate_id).first()
    if not cert:
        return

    verify_url = f'{settings.FRONTEND_URL}/verify/{cert.code}'
    recipients = [cert.user.email]
    manager = cert.user.manager
    if manager and manager.email:
        recipients.append(manager.email)

    send_mail(
        subject=f'Certificate earned: {cert.course_title}',
        message=(
            f'{cert.holder_name} completed “{cert.course_title}”.\n\n'
            f'Certificate code: {cert.code}\n'
            f'Verify it here: {verify_url}\n'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=True,
    )
