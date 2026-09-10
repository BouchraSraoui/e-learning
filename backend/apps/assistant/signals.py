"""Content-change signals → re-embed tasks (docs/PHASE-7-RAG.md §4.1).

The assistant app subscribes to the content apps; content apps never import
assistant (acyclic rule, same pattern as engagement).
"""

from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.courses.models import Course, Lesson, Module, Resource

from .models import FaqEntry
from .tasks import reindex_course_task, reindex_faq_task


def _enabled() -> bool:
    return settings.ASSISTANT_RAG_ENABLED


@receiver(post_save, sender=FaqEntry)
@receiver(post_delete, sender=FaqEntry)
def faq_changed(sender, instance, **kwargs):
    # raw = fixture loading (loaddata / seed_db): the fixture already carries the
    # built index — re-embedding every row mid-load is wasted work (and needs Ollama).
    # post_delete never passes `raw`, so the delete path is unaffected by the guard.
    if kwargs.get('raw'):
        return
    if _enabled():
        reindex_faq_task.delay(instance.id)


@receiver(post_save, sender=Course)
@receiver(post_delete, sender=Course)
def course_changed(sender, instance, **kwargs):
    if kwargs.get('raw'):
        return
    if _enabled():
        reindex_course_task.delay(instance.id)


@receiver(post_save, sender=Module)
@receiver(post_delete, sender=Module)
@receiver(post_save, sender=Resource)
@receiver(post_delete, sender=Resource)
def course_child_changed(sender, instance, **kwargs):
    if kwargs.get('raw'):
        return
    if _enabled():
        reindex_course_task.delay(instance.course_id)


@receiver(post_save, sender=Lesson)
@receiver(post_delete, sender=Lesson)
def lesson_changed(sender, instance, **kwargs):
    if kwargs.get('raw') or not _enabled():
        return
    # During a course cascade-delete the module row may already be gone; the
    # Course post_delete signal cleans the whole tree up in that case.
    course_id = (
        Module.objects.filter(id=instance.module_id)
        .values_list('course_id', flat=True).first()
    )
    if course_id:
        reindex_course_task.delay(course_id)
