from rest_framework.permissions import BasePermission

from apps.accounts.models import Role
from apps.common.permissions import is_on_net

from .models import Course, Lesson, Module, Resource


def owning_course(obj):
    if isinstance(obj, Course):
        return obj
    if isinstance(obj, Module):
        return obj.course
    if isinstance(obj, Lesson):
        return obj.module.course
    if isinstance(obj, Resource):
        return obj.course
    course = getattr(obj, 'course', None)
    if course is not None:
        return course
    module = getattr(obj, 'module', None)
    return module.course if module is not None else None


def can_author(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, 'is_admin_role', False) or getattr(user, 'role', None) == Role.MANAGER)
    )


def can_manage_course(user, course) -> bool:
    if not (user and user.is_authenticated):
        return False
    if getattr(user, 'is_admin_role', False):
        return True
    if getattr(user, 'role', None) == Role.MANAGER:
        return course is not None and course.author_id == user.id
    return False


class IsCourseAuthorOrAdmin(BasePermission):

    def has_permission(self, request, view):
        # Authoring (the management console) is on-net only (spec 2.6.2). Gate here,
        # not in can_author(), which is reused for read visibility scoping.
        return can_author(request.user) and is_on_net(request)

    def has_object_permission(self, request, view, obj):
        return can_manage_course(request.user, owning_course(obj))
