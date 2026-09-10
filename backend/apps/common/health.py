from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def _check_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    from django.conf import settings

    if not getattr(settings, 'REDIS_URL', ''):
        return None
    try:
        import redis

        client = redis.Redis.from_url(settings.REDIS_URL)
        return bool(client.ping())
    except Exception:
        return False


@extend_schema(responses={200: None, 503: None})
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request):
    checks = {'database': _check_database(), 'redis': _check_redis()}
    healthy = all(v is not False for v in checks.values())
    return Response(
        {'status': 'ok' if healthy else 'degraded', 'checks': checks},
        status=200 if healthy else 503,
    )
