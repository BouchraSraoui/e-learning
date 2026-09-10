from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _user_from_token(raw_token):
    from rest_framework_simplejwt.authentication import JWTAuthentication

    auth = JWTAuthentication()
    try:
        validated = auth.get_validated_token(raw_token)
        return auth.get_user(validated)
    except Exception:
        return AnonymousUser()


def _extract_token(scope):
    qs = parse_qs((scope.get('query_string') or b'').decode())
    token = qs.get('token', [None])[0]
    if token:
        return token
    for name, value in scope.get('headers', []):
        if name == b'sec-websocket-protocol':
            parts = [p.strip() for p in value.decode().split(',')]
            if len(parts) >= 2 and parts[0] == 'jwt':
                return parts[1]
    return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        raw = _extract_token(scope)
        scope['user'] = await _user_from_token(raw) if raw else AnonymousUser()
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
