from .models import Notification


def create_notification(recipient, ntype, title, body='', url='', *, email=False, dedupe=False):
    if dedupe and Notification.objects.filter(
        recipient=recipient, type=ntype, url=url, is_read=False
    ).exists():
        return None

    notification = Notification.objects.create(
        recipient=recipient, type=ntype, title=title, body=body, url=url
    )

    if email and getattr(recipient, 'email_notifications', False) and recipient.email:
        from .tasks import send_notification_email

        send_notification_email.delay(notification.id)
    return notification
