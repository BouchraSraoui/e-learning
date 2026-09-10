"""Course visibility rules shared by the catalog, dashboard and enrolment.

Admins see every course; managers see all published courses plus their own
drafts. Everyone else sees published courses EXCEPT department-scoped ones
aimed at another department: those are auto-assigned to the department's
members (apps/progress/signals.py) and must not be listed for anyone else.
An existing enrolment still grants visibility — narrowing a course's
audience keeps prior enrolments, and their "My Learning" links must not
break.
"""
from django.db.models import Q

from .models import Course


def _is_authenticated(user) -> bool:
    return user is not None and user.is_authenticated


def audience_scope_q(user, prefix: str = '') -> Q:
    """Limit department-scoped courses to their members; staff are exempt.

    ``prefix`` lets the filter apply through a relation, e.g. ``'courses__'``
    when counting a category's visible courses.
    """
    if _is_authenticated(user) and (
        getattr(user, 'is_admin_role', False) or getattr(user, 'is_manager_role', False)
    ):
        return Q()
    scope = ~Q(**{f'{prefix}audience': Course.Audience.DEPARTMENT})
    if _is_authenticated(user):
        if user.department_id:
            scope |= Q(**{f'{prefix}department_id': user.department_id})
        from apps.progress.models import Enrollment

        scope |= Q(**{
            f'{prefix}pk__in': Enrollment.objects.filter(user=user).values('course_id')
        })
    return scope


def visible_courses_q(user, prefix: str = '') -> Q:
    """Everything a user may see in the catalog: drafts + audience combined."""
    if _is_authenticated(user) and getattr(user, 'is_admin_role', False):
        return Q()
    published = Q(**{f'{prefix}is_published': True})
    if _is_authenticated(user) and getattr(user, 'is_manager_role', False):
        return published | Q(**{f'{prefix}author_id': user.id})
    return published & audience_scope_q(user, prefix)
