"""Self-contained DEMO OIDC identity provider — DEV ONLY.

Mounted only when ``settings.SSO_DEMO_IDP`` is true (never in test/prod — see
config/urls.py and settings/test.py). It lets the whole SSO flow run end to end
on one machine with no external directory, speaking real OIDC (authorization-code
+ PKCE, RS256-signed id_tokens, JWKS) so the relying-party code it exercises is
exactly the code that will authenticate against Icosnet's real IdP. It is NOT a
security boundary and must never run in production.
"""
import base64
import hashlib
import html
import json
import logging
import secrets
import time
from datetime import timedelta

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import (
    HttpResponse,
    HttpResponseBadRequest,
    HttpResponseRedirect,
    JsonResponse,
)
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import DemoAuthCode

logger = logging.getLogger(__name__)
User = get_user_model()

_key = None  # (private_pem_str, public_jwk_dict, kid)


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()


def _load_key():
    """Return (private_pem, public_jwk, kid). Ephemeral in-process key if unset."""
    global _key
    if _key is not None:
        return _key
    pem = settings.SSO_DEMO_SIGNING_KEY
    if pem:
        private_key = serialization.load_pem_private_key(pem.encode(), password=None)
    else:
        logger.warning('SSO demo IdP: using an ephemeral in-process RSA key (dev only).')
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    kid = _b64url(hashlib.sha256((jwk['n'] + jwk['e']).encode()).digest())[:16]
    jwk.update({'kid': kid, 'use': 'sig', 'alg': 'RS256'})
    _key = (private_pem, jwk, kid)
    return _key


def _issuer() -> str:
    return settings.SSO_DEMO_ISSUER.rstrip('/')


# --- discovery + keys ------------------------------------------------------

def openid_configuration(request):
    iss = _issuer()
    return JsonResponse({
        'issuer': iss,
        'authorization_endpoint': f'{iss}/authorize',
        'token_endpoint': f'{iss}/token',
        'userinfo_endpoint': f'{iss}/userinfo',
        'jwks_uri': f'{iss}/jwks',
        'response_types_supported': ['code'],
        'subject_types_supported': ['public'],
        'id_token_signing_alg_values_supported': ['RS256'],
        'scopes_supported': ['openid', 'email', 'profile'],
        'token_endpoint_auth_methods_supported': ['client_secret_post', 'client_secret_basic'],
        'claims_supported': [
            'sub', 'email', 'email_verified', 'given_name', 'family_name', 'name', 'department',
        ],
        'code_challenge_methods_supported': ['S256'],
    })


def jwks(request):
    _priv, public_jwk, _kid = _load_key()
    return JsonResponse({'keys': [public_jwk]})


# --- authorize -------------------------------------------------------------

def _validate_authorize(params) -> str:
    if params.get('response_type') != 'code':
        return 'unsupported response_type (demo IdP supports only "code")'
    if params.get('client_id') != settings.SSO_CLIENT_ID:
        return 'unknown client_id'
    if params.get('redirect_uri') != settings.SSO_REDIRECT_URI:
        return 'redirect_uri mismatch'
    if not params.get('code_challenge') or params.get('code_challenge_method') != 'S256':
        return 'PKCE S256 code_challenge required'
    return ''


@csrf_exempt
def authorize(request):
    if request.method == 'POST':
        return _authorize_post(request)
    error = _validate_authorize(request.GET)
    if error:
        return HttpResponseBadRequest(error)
    return HttpResponse(_login_page_html(request.GET))


def _authorize_post(request):
    params = request.POST
    error = _validate_authorize(params)
    if error:
        return HttpResponseBadRequest(error)

    pick = (params.get('pick_email') or '').strip()
    if pick:
        user = User.objects.filter(email__iexact=pick).first()
        if not user:
            return HttpResponseBadRequest('unknown account')
        claims = {
            'email': user.email,
            'given_name': user.first_name,
            'family_name': user.last_name,
            'name': user.full_name,
            'department': user.department.name if user.department_id else '',
        }
    else:
        email = (params.get('custom_email') or '').strip()
        if not email:
            return HttpResponseBadRequest('email required')
        claims = {
            'email': email,
            'given_name': (params.get('given_name') or '').strip(),
            'family_name': (params.get('family_name') or '').strip(),
            'name': '',
            'department': (params.get('department') or '').strip(),
        }

    code = secrets.token_urlsafe(32)
    DemoAuthCode.objects.create(
        code=code,
        claims=claims,
        nonce=params.get('nonce', ''),
        code_challenge=params.get('code_challenge', ''),
        client_id=params.get('client_id', ''),
        redirect_uri=params.get('redirect_uri', ''),
        expires_at=timezone.now() + timedelta(seconds=60),
    )
    redirect_uri = params.get('redirect_uri', '')
    sep = '&' if '?' in redirect_uri else '?'
    return HttpResponseRedirect(
        f"{redirect_uri}{sep}code={code}&state={html.escape(params.get('state', ''))}"
    )


# --- token + userinfo ------------------------------------------------------

def _client_credentials(request):
    client_id = request.POST.get('client_id')
    client_secret = request.POST.get('client_secret')
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if client_id is None and auth.lower().startswith('basic '):
        try:
            decoded = base64.b64decode(auth.split(' ', 1)[1]).decode()
            client_id, client_secret = decoded.split(':', 1)
        except Exception:
            client_id = client_secret = None
    return client_id, client_secret


@csrf_exempt
def token(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'invalid_request'}, status=400)

    client_id, client_secret = _client_credentials(request)
    if client_id != settings.SSO_CLIENT_ID or client_secret != settings.SSO_CLIENT_SECRET:
        return JsonResponse({'error': 'invalid_client'}, status=401)
    if request.POST.get('grant_type') != 'authorization_code':
        return JsonResponse({'error': 'unsupported_grant_type'}, status=400)

    code = request.POST.get('code', '')
    verifier = request.POST.get('code_verifier', '')
    redirect_uri = request.POST.get('redirect_uri', '')

    row = DemoAuthCode.objects.filter(code=code).first()
    if not row or row.used_at or row.is_expired():
        return JsonResponse({'error': 'invalid_grant'}, status=400)
    if redirect_uri != row.redirect_uri or client_id != row.client_id:
        return JsonResponse({'error': 'invalid_grant'}, status=400)

    # PKCE: the verifier must hash to the challenge captured at /authorize.
    challenge = _b64url(hashlib.sha256(verifier.encode()).digest())
    if not verifier or challenge != row.code_challenge:
        return JsonResponse(
            {'error': 'invalid_grant', 'error_description': 'PKCE verification failed'},
            status=400,
        )

    row.used_at = timezone.now()
    row.save(update_fields=['used_at'])

    return JsonResponse({
        'access_token': _sign({**_userinfo_claims(row.claims), 'typ': 'at'}),
        'token_type': 'Bearer',
        'expires_in': 300,
        'id_token': _make_id_token(row.claims, row.nonce),
        'scope': 'openid email profile',
    })


def userinfo(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth.lower().startswith('bearer '):
        return JsonResponse({'error': 'invalid_token'}, status=401)
    _priv, jwk, _kid = _load_key()
    try:
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
        payload = jwt.decode(
            auth.split(' ', 1)[1], public_key, algorithms=['RS256'],
            issuer=_issuer(), options={'verify_aud': False},
        )
    except Exception:
        return JsonResponse({'error': 'invalid_token'}, status=401)
    return JsonResponse({
        'sub': payload.get('sub'),
        'email': payload.get('email'),
        'given_name': payload.get('given_name'),
        'family_name': payload.get('family_name'),
        'department': payload.get('department'),
    })


def _userinfo_claims(claims: dict) -> dict:
    email = (claims.get('email') or '').lower()
    return {
        'iss': _issuer(),
        'sub': f'demo|{email}',
        'email': claims.get('email'),
        'given_name': claims.get('given_name') or '',
        'family_name': claims.get('family_name') or '',
        'department': claims.get('department') or '',
    }


def _sign(payload: dict) -> str:
    private_pem, _jwk, kid = _load_key()
    now = int(time.time())
    return jwt.encode(
        {**payload, 'iat': now, 'exp': now + 300},
        private_pem, algorithm='RS256', headers={'kid': kid},
    )


def _make_id_token(claims: dict, nonce: str) -> str:
    base = _userinfo_claims(claims)
    full = f"{base['given_name']} {base['family_name']}".strip()
    payload = {
        **base,
        'aud': settings.SSO_CLIENT_ID,
        'email_verified': True,
        'name': claims.get('name') or full,
    }
    if nonce:
        payload['nonce'] = nonce
    return _sign(payload)


# --- demo sign-in page -----------------------------------------------------

def _login_page_html(params) -> str:
    hidden = ''.join(
        f'<input type="hidden" name="{k}" value="{html.escape(params.get(k, ""))}">'
        for k in (
            'response_type', 'client_id', 'redirect_uri', 'state', 'nonce',
            'code_challenge', 'code_challenge_method', 'scope',
        )
    )
    rows = []
    for u in User.objects.order_by('role', 'email')[:15]:
        rows.append(
            '<button class="acct" type="submit" name="pick_email" '
            f'value="{html.escape(u.email)}">'
            '<span class="acct-id">'
            f'<span class="nm">{html.escape(u.full_name or u.email)}</span>'
            f'<span class="em">{html.escape(u.email)}</span>'
            '</span>'
            f'<span class="role role-{html.escape(u.role)}">{html.escape(u.role)}</span>'
            '</button>'
        )
    accounts = '\n'.join(rows) or (
        '<p class="empty">No accounts yet — provision one with the form below.</p>'
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Icosnet — Demo SSO sign-in</title>
<style>
  :root {{ color-scheme: light; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         padding:24px; color:#0F172A;
         font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
         background:radial-gradient(1100px 620px at 50% -12%, rgba(37,99,235,.30), transparent 60%),
                    linear-gradient(160deg,#0F172A 0%,#111C33 46%,#0B1A3A 100%); }}
  .card {{ width:100%; max-width:452px; background:#fff; border-radius:20px; padding:30px 30px 24px;
          box-shadow:0 24px 70px -12px rgba(2,8,23,.55), 0 6px 18px -8px rgba(2,8,23,.40); }}
  .brand {{ display:flex; flex-direction:column; align-items:flex-start; line-height:1; margin-bottom:16px; }}
  .brand .wm {{ font-size:22px; font-weight:800; letter-spacing:-.02em; color:#00AEEF; }}
  .brand .sub {{ margin-top:6px; font-size:10px; font-weight:700; letter-spacing:.25em;
                text-transform:uppercase; color:#94A3B8; }}
  .badge {{ display:inline-flex; align-items:center; font-size:10.5px; font-weight:800; letter-spacing:.07em;
           text-transform:uppercase; color:#B45309; background:#FEF3C7; border:1px solid #FDE68A;
           padding:5px 11px; border-radius:999px; margin-bottom:14px; }}
  h1 {{ font-size:21px; line-height:1.25; margin:0 0 7px; color:#0F172A; font-weight:800; letter-spacing:-.01em; }}
  .muted {{ color:#64748B; font-size:13.5px; line-height:1.55; margin:0 0 20px; }}
  .muted b {{ color:#334155; font-weight:700; }}
  .empty {{ color:#64748B; font-size:13px; text-align:center; padding:14px; margin:0;
           border:1px dashed #E2E8F0; border-radius:12px; }}
  .accts {{ display:flex; flex-direction:column; gap:9px; }}
  .acct {{ display:flex; align-items:center; gap:12px; width:100%; text-align:left; cursor:pointer;
          background:#fff; border:1px solid #E2E8F0; border-radius:14px; padding:12px 14px;
          transition:border-color .13s, background .13s, box-shadow .13s; }}
  .acct:hover {{ border-color:#93BBFD; background:#EFF5FF; box-shadow:0 4px 12px -4px rgba(37,99,235,.25); }}
  .acct-id {{ display:flex; flex-direction:column; gap:2px; min-width:0; }}
  .acct .nm {{ font-weight:650; font-size:14px; color:#0F172A; }}
  .acct .em {{ font-size:12px; color:#64748B; }}
  .role {{ margin-left:auto; flex-shrink:0; font-size:10px; font-weight:800; text-transform:uppercase;
          letter-spacing:.04em; padding:3px 8px; border-radius:999px; background:#E2E8F0; color:#475569; }}
  .role-admin {{ background:#FEE2E2; color:#B91C1C; }}
  .role-manager {{ background:#DBEAFE; color:#1D4ED8; }}
  .or {{ display:flex; align-items:center; gap:12px; margin:20px 0 14px; font-size:11px; font-weight:700;
        letter-spacing:.06em; text-transform:uppercase; color:#94A3B8; }}
  .or::before, .or::after {{ content:""; height:1px; flex:1; background:#E2E8F0; }}
  .inp {{ width:100%; height:46px; border:1px solid #E2E8F0; border-radius:12px; padding:0 13px;
         font-size:14px; color:#0F172A; background:#fff; margin-bottom:9px; font-family:inherit;
         transition:border-color .13s, box-shadow .13s; }}
  .inp::placeholder {{ color:#94A3B8; }}
  .inp:focus {{ outline:none; border-color:#609AFA; box-shadow:0 0 0 4px #DBE8FE; }}
  .two {{ display:flex; gap:9px; }}
  .primary {{ width:100%; height:48px; margin-top:4px; background:#2563EB; color:#fff; border:0;
             border-radius:12px; font-size:14.5px; font-weight:700; cursor:pointer; font-family:inherit;
             box-shadow:0 8px 24px -6px rgba(37,99,235,.45); transition:background .13s, transform .04s; }}
  .primary:hover {{ background:#1D4ED8; }}
  .primary:active {{ transform:translateY(1px); }}
  .foot {{ margin-top:16px; text-align:center; font-size:11.5px; color:#94A3B8; }}
</style></head>
<body>
  <div class="card">
    <div class="brand"><span class="wm">icosnet</span><span class="sub">Training Platform</span></div>
    <span class="badge">Demo IdP · development only</span>
    <h1>Sign in with the Icosnet directory</h1>
    <p class="muted">This is a self-contained demo identity provider standing in for your real
      staff directory. Pick an account, or provision a new one by email. Your
      <b>role is decided by the app</b>, never by this login.</p>
    <form method="post">
      {hidden}
      <div class="accts">{accounts}</div>
      <div class="or">or provision a new user</div>
      <input class="inp" type="email" name="custom_email" placeholder="name@icosnet.com" autocomplete="off">
      <div class="two">
        <input class="inp" name="given_name" placeholder="First name">
        <input class="inp" name="family_name" placeholder="Last name">
      </div>
      <input class="inp" name="department" placeholder="Department (optional)">
      <button class="primary" type="submit" name="use_custom" value="1">Sign in</button>
    </form>
    <p class="foot">Development sign-in · no password required</p>
  </div>
</body></html>"""
