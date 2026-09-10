"""Shared DRF permissions.

``RequireOnNet`` / ``is_on_net`` gate privileged operations to the internal Icosnet
network (spec 2.6.2). Fail-closed: a missing ``request.on_net`` (set by
``apps/common/network.NetworkModeMiddleware``) is treated as off-net and denied.
Folded into the admin/manager permission classes so the whole management console —
course authoring, user & role management, analytics, reports, data export — is
on-net only, without touching individual views.
"""
from rest_framework.permissions import BasePermission


def is_on_net(request) -> bool:
    """True when the request reaches us from the internal network. Fail-closed."""
    return bool(getattr(request, 'on_net', False))


class RequireOnNet(BasePermission):
    message = 'This action is available only on the internal Icosnet network.'

    def has_permission(self, request, view):
        return is_on_net(request)
