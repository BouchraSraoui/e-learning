"""On-net / Off-net access mode (spec 2.6.2).

Determines, per request, whether the caller reaches the platform from inside the
internal Icosnet network (on-net) or via secured external access — VPN or controlled
access (off-net). ``NetworkModeMiddleware`` attaches ``request.on_net`` (bool) and
``request.access_mode`` ('on_net' | 'off_net'); ``network_status`` echoes the resolved
mode back to the SPA so it can render the access-mode badge.

Production derives the mode from the real client IP against ``NET_ONNET_CIDRS``,
failing closed to off-net (secured external) when nothing matches. The dev demo
(``NET_MODE_DEMO`` + ``DEBUG`` only) instead trusts an ``X-Access-Mode`` header set by
the front-end toggle, so the whole flow can be shown without the real Icosnet LAN or a
VPN. That header is NOT a security boundary — a client can send any value; it exists
only to demo the feature, exactly like the demo SSO IdP. Production ignores it.
"""
import ipaddress
import logging

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

ON_NET = 'on_net'
OFF_NET = 'off_net'
DEMO_HEADER = 'HTTP_X_ACCESS_MODE'  # request.META key for the X-Access-Mode header


def _client_ip(request) -> str:
    """Best-effort client IP: the trusted X-Forwarded-For hop, else REMOTE_ADDR."""
    if getattr(settings, 'NET_TRUST_FORWARDED_FOR', False):
        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if forwarded:
            return forwarded.split(',')[0].strip()  # left-most = originating client
    return request.META.get('REMOTE_ADDR', '') or ''


def _ip_on_net(ip: str) -> bool:
    """True when ``ip`` falls inside any configured internal Icosnet CIDR."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for cidr in getattr(settings, 'NET_ONNET_CIDRS', []) or []:
        try:
            if addr in ipaddress.ip_network(cidr, strict=False):
                return True
        except ValueError:
            logger.warning('Ignoring invalid NET_ONNET_CIDRS entry: %r', cidr)
    return False


def _demo_active() -> bool:
    return bool(getattr(settings, 'NET_MODE_DEMO', False) and settings.DEBUG)


def resolve_access_mode(request) -> str:
    """Return ``'on_net'`` or ``'off_net'`` for this request.

    Demo (dev only): trust the simulated origin from the ``X-Access-Mode`` header or,
    as a fallback, a ``?net=`` query param — native browser requests (``<iframe>``,
    ``<video>``, download ``<a href>``) can't set headers, so media/download URLs pass
    the mode as a query param instead. Precedence: header, then query, then default
    on-net. Production: real client IP vs the internal CIDR allowlist, failing closed
    to off-net (secured external access) — the header/param are ignored.
    """
    if _demo_active():
        signal = (request.META.get(DEMO_HEADER) or request.GET.get('net') or '').strip().lower()
        return OFF_NET if signal == OFF_NET else ON_NET
    return ON_NET if _ip_on_net(_client_ip(request)) else OFF_NET


class NetworkModeMiddleware:
    """Attach ``request.access_mode`` / ``request.on_net`` for views and the badge."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        mode = resolve_access_mode(request)
        request.access_mode = mode
        request.on_net = mode == ON_NET
        return self.get_response(request)


@extend_schema(responses={200: None})
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def network_status(request):
    """Report the resolved access mode to the SPA (drives the on-net/off-net badge)."""
    mode = getattr(request, 'access_mode', None) or resolve_access_mode(request)
    return Response({
        'mode': mode,
        'on_net': mode == ON_NET,
        'demo': _demo_active(),
    })
