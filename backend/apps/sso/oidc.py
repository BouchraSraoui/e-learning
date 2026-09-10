"""OIDC relying-party (RP) client — provider-agnostic.

This is the REAL production code path: it authenticates against whatever OIDC
issuer the ``SSO_*`` settings name. In dev those default to the bundled demo IdP
(``apps.sso.idp_demo``); in prod they point at Icosnet's real directory (Entra
ID / Keycloak / ADFS) with **no code change** — only settings differ. Nothing
here is demo-specific.
"""
import base64
import hashlib
import secrets
import time
from urllib.parse import urlencode

import jwt
import requests
from django.conf import settings

_DISCOVERY_TTL = 300
_discovery_cache: dict = {}


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()


def get_provider_config() -> dict:
    """Fetch + cache the issuer's OIDC discovery document."""
    url = settings.SSO_DISCOVERY_URL
    now = time.time()
    hit = _discovery_cache.get(url)
    if hit and hit[0] > now:
        return hit[1]
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    cfg = resp.json()
    _discovery_cache[url] = (now + _DISCOVERY_TTL, cfg)
    return cfg


def build_pkce():
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = secrets.token_urlsafe(64)
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    return verifier, challenge


def authorization_url(state: str, nonce: str, code_challenge: str) -> str:
    cfg = get_provider_config()
    params = {
        'response_type': 'code',
        'client_id': settings.SSO_CLIENT_ID,
        'redirect_uri': settings.SSO_REDIRECT_URI,
        'scope': settings.SSO_SCOPES,
        'state': state,
        'nonce': nonce,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
    }
    return f"{cfg['authorization_endpoint']}?{urlencode(params)}"


def exchange_code(code: str, code_verifier: str) -> dict:
    """Trade the authorization code for tokens at the issuer's token endpoint."""
    cfg = get_provider_config()
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': settings.SSO_REDIRECT_URI,
        'code_verifier': code_verifier,
    }
    auth = None
    if settings.SSO_TOKEN_AUTH_METHOD == 'client_secret_basic':
        auth = (settings.SSO_CLIENT_ID, settings.SSO_CLIENT_SECRET)
    else:  # client_secret_post (default)
        data['client_id'] = settings.SSO_CLIENT_ID
        data['client_secret'] = settings.SSO_CLIENT_SECRET
    resp = requests.post(
        cfg['token_endpoint'], data=data, auth=auth, timeout=10,
        headers={'Accept': 'application/json'},
    )
    resp.raise_for_status()
    return resp.json()


def _signing_key(id_token: str):
    """Resolve the RS256 public key for an id_token via the issuer JWKS.

    Isolated so tests can stub it with a locally generated key.
    """
    cfg = get_provider_config()
    client = jwt.PyJWKClient(cfg['jwks_uri'])
    return client.get_signing_key_from_jwt(id_token).key


def verify_id_token(id_token: str, nonce: str) -> dict:
    """Verify signature + iss/aud/exp/iat + nonce. Raises on any failure.

    The algorithm is pinned to RS256 (never ``none``/HS) to close the classic
    algorithm-confusion hole; PyJWT enforces the required registered claims.
    """
    key = _signing_key(id_token)
    claims = jwt.decode(
        id_token,
        key,
        algorithms=['RS256'],
        audience=settings.SSO_CLIENT_ID,
        issuer=settings.SSO_ISSUER,
        options={'require': ['exp', 'iat', 'iss', 'aud']},
        leeway=30,
    )
    if not nonce or claims.get('nonce') != nonce:
        raise jwt.InvalidTokenError('nonce mismatch')
    return claims


def extract_claims(claims: dict) -> dict:
    return {
        'email': claims.get('email'),
        'email_verified': claims.get('email_verified'),
        'given_name': claims.get('given_name'),
        'family_name': claims.get('family_name'),
        'name': claims.get('name'),
    }
