from rest_framework.permissions import BasePermission

from apps.common.permissions import is_on_net

from .models import Role


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_admin_role and is_on_net(request)
        )


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_admin_role or user.role == Role.MANAGER)
            and is_on_net(request)
        )


class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return bool(
            user and user.is_authenticated and (user.is_admin_role or obj.pk == user.pk)
        )
