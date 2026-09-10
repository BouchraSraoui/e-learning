"""Automatic course assignment by audience.

A course whose ``audience`` is ``GENERAL`` is assigned to every active user when it
is published; a ``DEPARTMENT`` course is assigned to the active members of its
``department``. Users inherit their scoped courses when they are created, moved to a
department, or reactivated.

Both paths mirror the manual assignment in ``AssignmentViewSet.create``: an
``Assignment`` plus an auto-enrolment, created idempotently with ``get_or_create`` so
the course lands in "My Learning" and surfaces in the dashboard's "Assigned to you"
section. Courses with the default ``OPEN`` audience are untouched (normal catalog).

**Transition-gated:** the fan-out runs only when the *target set can change* — a course
being created/published or having its audience/department edited, or a user being
created/moved/reactivated. A trivial edit (e.g. fixing a course summary, a stats
recompute that re-saves the user) does NOT re-run the sweep. This keeps a save O(1)
except on a genuine transition.

**Additive by design:** narrowing a course's audience does NOT retract the assignments
already granted to now-out-of-scope users — auto-retraction would delete their
``Enrollment`` and the learning progress attached to it. Removing a learner from a
course they were assigned is left to the explicit manual assignment controls.

**Scale note:** on a transition the fan-out is O(active users) synchronous
``get_or_create`` calls. That is fine for an internal LMS (hundreds of employees). For a
very large tenant, move ``sync_course_assignments`` to a Celery task and switch to
``bulk_create(..., ignore_conflicts=True)``.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.accounts.models import User
from apps.courses.models import Course

from .models import Assignment, Enrollment


def _ensure_assignment(user, course):
    Assignment.objects.get_or_create(user=user, course=course)
    Enrollment.objects.get_or_create(user=user, course=course)


def sync_course_assignments(course) -> int:
    """Assign a published general/department course to its target audience.

    Idempotent. Returns the number of target users.
    """
    if not course.is_published:
        return 0
    if course.audience == Course.Audience.GENERAL:
        targets = User.objects.filter(is_active=True)
    elif course.audience == Course.Audience.DEPARTMENT and course.department_id:
        targets = User.objects.filter(is_active=True, department_id=course.department_id)
    else:
        return 0
    count = 0
    for user in targets:
        _ensure_assignment(user, course)
        count += 1
    return count


def assign_scoped_courses_to_user(user) -> int:
    """Assign all published general courses + the user's department courses."""
    if not user.is_active:
        return 0
    courses = Course.objects.filter(is_published=True, audience=Course.Audience.GENERAL)
    if user.department_id:
        courses = courses | Course.objects.filter(
            is_published=True,
            audience=Course.Audience.DEPARTMENT,
            department_id=user.department_id,
        )
    count = 0
    for course in courses.distinct():
        _ensure_assignment(user, course)
        count += 1
    return count


# --- Course: fan out only when the target set can change -------------------

@receiver(pre_save, sender=Course)
def _snapshot_course(sender, instance, **kwargs):
    # raw = fixture loading (loaddata / seed_db): rows are being copied verbatim, so
    # no side effects — otherwise loading a published Course auto-creates Enrollments
    # that collide with the fixture's own Enrollment rows. Same guard on every
    # pre_save/post_save receiver in this project.
    if kwargs.get('raw'):
        return
    if instance.pk:
        instance._prev_audience_state = (
            Course.objects.filter(pk=instance.pk)
            .values('is_published', 'audience', 'department_id')
            .first()
        )
    else:
        instance._prev_audience_state = None


@receiver(post_save, sender=Course)
def _auto_assign_on_course_save(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    if not instance.is_published:
        return
    prev = getattr(instance, '_prev_audience_state', None)
    if created or prev is None:
        changed = True
    else:
        changed = (
            not prev['is_published']  # just published
            or prev['audience'] != instance.audience
            or prev['department_id'] != instance.department_id
        )
    if changed:
        sync_course_assignments(instance)


# --- User: assign scoped courses on create / department move / reactivation --

@receiver(pre_save, sender=User)
def _snapshot_user(sender, instance, **kwargs):
    if kwargs.get('raw'):
        return
    if instance.pk:
        instance._prev_scope_state = (
            User.objects.filter(pk=instance.pk)
            .values('department_id', 'is_active')
            .first()
        )
    else:
        instance._prev_scope_state = None


@receiver(post_save, sender=User)
def _auto_assign_on_user_change(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return
    if not instance.is_active:
        return
    prev = getattr(instance, '_prev_scope_state', None)
    if created:
        relevant = True
    elif prev is None:
        relevant = False
    else:
        relevant = (
            prev['department_id'] != instance.department_id  # moved department
            or not prev['is_active']  # reactivated
        )
    if relevant:
        assign_scoped_courses_to_user(instance)
