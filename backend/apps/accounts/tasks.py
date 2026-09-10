from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_password_reset_email(email: str, reset_url: str):
    send_mail(
        subject='Reset your Icosnet Learning password',
        message=(
            'We received a request to reset your Icosnet Learning password.\n\n'
            f'Reset it here: {reset_url}\n\n'
            "If you didn't request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=True,
    )


@shared_task
def send_welcome_email(email: str, login_url: str):
    send_mail(
        subject='Welcome to Icosnet Learning',
        message=f'Your Icosnet Learning account is ready. Sign in: {login_url}',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=True,
    )
