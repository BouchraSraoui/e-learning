"""Short-lived, single-use stores for the OIDC SSO handshake.

No Django cache backend is configured (dev falls back to per-process LocMemCache,
which is unsafe across daphne/gunicorn workers), so the login/callback state and
the SPA hand-off code live in the database, matching the codebase's
model-per-concern style. Every row is time-boxed and consumed on read; prune with
``manage.py`` or a beat task if the tables grow.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone


class SsoAuthRequest(models.Model):
    """Outbound leg: state + nonce + PKCE verifier, written at /login/, read once
    at /callback/. Never leaves the server (only the S256 challenge is sent out)."""

    state = models.CharField(max_length=128, unique=True, db_index=True)
    nonce = models.CharField(max_length=128)
    code_verifier = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f'sso-auth-request {self.state[:8]}…'


class SsoHandoffCode(models.Model):
    """The only token that ever rides in a URL (``/sso/complete?code=``). Opaque,
    single-use, short-TTL — NOT a JWT and carrying no claims. The SPA trades it at
    /exchange/ for a real SimpleJWT pair."""

    code = models.CharField(max_length=128, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sso_handoffs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f'sso-handoff {self.code[:8]}… → user {self.user_id}'


class DemoAuthCode(models.Model):
    """Authorization code minted by the DEMO IdP only (dev). Binds the code to the
    resolved claims + nonce + PKCE challenge so /token can verify and issue an
    id_token. Never created outside dev (the demo IdP is flag-gated)."""

    code = models.CharField(max_length=128, unique=True, db_index=True)
    claims = models.JSONField(default=dict)
    nonce = models.CharField(max_length=128, blank=True)
    code_challenge = models.CharField(max_length=128)
    client_id = models.CharField(max_length=128)
    redirect_uri = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f'demo-auth-code {self.code[:8]}…'
