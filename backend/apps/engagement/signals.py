from django.db.models.signals import post_save
from django.dispatch import Signal, receiver

from apps.assessments.models import QuizAttempt
from apps.progress.models import Certificate, Enrollment, LessonProgress

from .models import Comment

badge_earned = Signal()
comment_created = Signal()


@receiver(post_save, sender=Enrollment)
def _on_enrollment(sender, instance, created, **kwargs):
    # raw = fixture loading (loaddata / seed_db): copy rows verbatim, no side effects.
    if kwargs.get('raw'):
        return
    from .services import evaluate_badges

    evaluate_badges(instance.user)


@receiver(post_save, sender=LessonProgress)
def _on_lesson_progress(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    from .services import evaluate_badges, touch_activity

    user = instance.enrollment.user
    touch_activity(user)
    evaluate_badges(user)


@receiver(post_save, sender=Certificate)
def _on_certificate(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    from .services import evaluate_badges

    evaluate_badges(instance.user)


@receiver(post_save, sender=QuizAttempt)
def _on_quiz_attempt(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    from .services import evaluate_badges, touch_activity

    if created:
        touch_activity(instance.user)
    evaluate_badges(instance.user)


@receiver(post_save, sender=Comment)
def _on_comment(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    from .services import evaluate_badges, touch_activity

    if created:
        touch_activity(instance.author)
        evaluate_badges(instance.author)
        comment_created.send(sender=sender, comment=instance)
