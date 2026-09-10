from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.engagement.signals import badge_earned, comment_created
from apps.progress.models import Certificate, Enrollment

from .models import NotificationType
from .services import create_notification


@receiver(post_save, sender=Enrollment)
def _on_enrollment(sender, instance, created, **kwargs):
    # raw = fixture loading (loaddata / seed_db): copy rows verbatim, no side effects.
    if kwargs.get('raw'):
        return
    if created:
        create_notification(
            instance.user,
            NotificationType.ENROLLMENT,
            f'Enrolled: {instance.course.title}',
            'You are enrolled. Start learning whenever you are ready.',
            f'/learn/{instance.course.slug}',
        )


@receiver(post_save, sender=Certificate)
def _on_certificate(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    if created:
        create_notification(
            instance.user,
            NotificationType.CERTIFICATE,
            f'Certificate earned: {instance.course_title}',
            'Congratulations! Your certificate is ready to download.',
            '/certificates',
        )


@receiver(badge_earned)
def _on_badge(sender, user, badge, **kwargs):
    create_notification(
        user,
        NotificationType.BADGE,
        f'Badge unlocked: {badge.name}',
        badge.description,
        '/badges',
    )


@receiver(comment_created)
def _on_comment(sender, comment, **kwargs):
    parent = comment.parent
    if parent and parent.author_id != comment.author_id:
        create_notification(
            parent.author,
            NotificationType.COMMENT_REPLY,
            'New reply to your comment',
            comment.body[:120],
            f'/catalog/{comment.course.slug}',
            email=True,
        )
