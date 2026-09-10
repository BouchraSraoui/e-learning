"""OIDC relying-party endpoints (always mounted; provider-agnostic).

Flow:  GET /login/ → 302 to the IdP  →  GET /callback/ (IdP redirects here) →
302 to {FRONTEND_URL}/sso/complete?code=<handoff>  →  POST /exchange/ trades the
single-use hand-off code for a real SimpleJWT pair. No JWT ever rides in a URL.

All three views set ``authentication_classes = []`` so a stale/expired Bearer token
lingering in the SPA's localStorage can never 401 the public handshake before the
view runs (same reasoning as apps/courses public media view).
"""
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer
from apps.accounts.views import _tokens_for

from . import oidc, provisioning
from .models import SsoAuthRequest, SsoHandoffCode

logger = logging.getLogger(__name__)

# Binds the login flow to the initiating browser (OIDC login-CSRF / session-swap
# defense): /callback/ only proceeds when this cookie matches the `state` query
# param, so an attacker cannot feed a victim a pre-authenticated callback URL.
SSO_STATE_COOKIE = 'sso_state'
SSO_COOKIE_PATH = '/api/auth/sso/'


def _fail_redirect() -> HttpResponseRedirect:
    """Generic, detail-free failure hand-off — the SPA shows sso.error."""
    return HttpResponseRedirect(f'{settings.FRONTEND_URL}/sso/complete?error=sso_failed')


class SsoLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'sso'

    def get(self, request):
        if not settings.SSO_ENABLED:
            return Response({'detail': 'sso_disabled'}, status=400)
        try:
            verifier, challenge = oidc.build_pkce()
            state = secrets.token_urlsafe(32)
            nonce = secrets.token_urlsafe(32)
            SsoAuthRequest.objects.create(
                state=state, nonce=nonce, code_verifier=verifier,
                expires_at=timezone.now() + timedelta(minutes=10),
            )
            url = oidc.authorization_url(state, nonce, challenge)
        except Exception:
            logger.exception('SSO login initiation failed')
            return _fail_redirect()
        resp = HttpResponseRedirect(url)
        resp.set_cookie(
            SSO_STATE_COOKIE, state, max_age=600, httponly=True,
            samesite='Lax', secure=not settings.DEBUG, path=SSO_COOKIE_PATH,
        )
        return resp


class SsoCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'sso'

    def get(self, request):
        resp = self._handle(request)
        resp.delete_cookie(SSO_STATE_COOKIE, path=SSO_COOKIE_PATH)
        return resp

    def _handle(self, request):
        state = request.query_params.get('state')
        code = request.query_params.get('code')
        if request.query_params.get('error') or not state or not code:
            return _fail_redirect()
        # Login-CSRF guard: the state must match the cookie set on THIS browser at
        # /login/. A forged callback delivered to a victim carries no matching cookie.
        if request.COOKIES.get(SSO_STATE_COOKIE) != state:
            logger.warning('SSO callback rejected: state/cookie mismatch')
            return _fail_redirect()

        authreq = SsoAuthRequest.objects.filter(state=state).first()
        if not authreq:
            return _fail_redirect()
        nonce, verifier, expired = authreq.nonce, authreq.code_verifier, authreq.is_expired()
        authreq.delete()  # single-use: consume immediately (state replay guard)
        if expired:
            return _fail_redirect()

        try:
            token_resp = oidc.exchange_code(code, verifier)
            id_token = token_resp.get('id_token')
            if not id_token:
                return _fail_redirect()
            claims = oidc.verify_id_token(id_token, nonce)
            user = provisioning.match_or_provision(oidc.extract_claims(claims))
        except Exception:
            logger.exception('SSO callback failed')
            return _fail_redirect()

        if not user.is_active:
            return _fail_redirect()

        handoff = SsoHandoffCode.objects.create(
            code=secrets.token_urlsafe(32), user=user,
            expires_at=timezone.now() + timedelta(seconds=120),
        )
        return HttpResponseRedirect(
            f'{settings.FRONTEND_URL}/sso/complete?code={handoff.code}'
        )


class SsoExchangeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'sso'

    def post(self, request):
        code = (request.data.get('code') or '').strip()
        if not code:
            return Response({'detail': 'invalid_code'}, status=400)

        with transaction.atomic():
            handoff = (
                SsoHandoffCode.objects.select_for_update()
                .filter(code=code)
                .first()
            )
            if not handoff or handoff.used_at or handoff.is_expired():
                return Response({'detail': 'code_expired_or_used'}, status=400)
            handoff.used_at = timezone.now()
            handoff.save(update_fields=['used_at'])
            user = handoff.user

        if not user.is_active:
            return Response({'detail': 'inactive'}, status=400)

        data = {
            **_tokens_for(user),
            'user': UserSerializer(user, context={'request': request}).data,
        }
        return Response(data, status=200)
