"""OIDC SSO tests — provisioning, id_token verification (real RS256), the callback
orchestration, single-use hand-off exchange, and the demo-IdP-off-under-test guard.

The relying-party verification path is exercised with a real locally generated RSA
key: ``oidc._signing_key`` is stubbed to return the matching public key, while
``oidc.exchange_code`` (the network hop to the IdP token endpoint) is stubbed.
"""
import time
from datetime import timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Department, Role, User
from apps.sso import oidc, provisioning
from apps.sso.models import SsoAuthRequest, SsoHandoffCode
from apps.sso.views import SSO_STATE_COOKIE

pytestmark = pytest.mark.django_db

ISSUER = 'https://idp.test'
CLIENT_ID = 'client-test'


def _pem(key) -> str:
    return key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()


# One signing key for the module + a second, unrelated key for the bad-signature case.
_PRIV = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PRIV_PEM = _pem(_PRIV)
_PUB = _PRIV.public_key()
_OTHER_PEM = _pem(rsa.generate_private_key(public_exponent=65537, key_size=2048))


def make_id_token(*, key=_PRIV_PEM, alg='RS256', nonce='nonce-123', aud=CLIENT_ID,
                  iss=ISSUER, email='sso.user@icosnet.demo', email_verified=True,
                  exp_delta=300, **extra):
    now = int(time.time())
    payload = {
        'iss': iss, 'aud': aud, 'iat': now, 'exp': now + exp_delta,
        'nonce': nonce, 'email': email, 'email_verified': email_verified, **extra,
    }
    if alg == 'none':
        return jwt.encode(payload, None, algorithm='none')
    return jwt.encode(payload, key, algorithm=alg)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture(autouse=True)
def sso_config(settings):
    settings.SSO_ISSUER = ISSUER
    settings.SSO_CLIENT_ID = CLIENT_ID
    settings.SSO_ENABLED = True
    settings.FRONTEND_URL = 'http://localhost:3000'


@pytest.fixture(autouse=True)
def stub_signing_key(monkeypatch):
    monkeypatch.setattr(oidc, '_signing_key', lambda id_token: _PUB)


# --- provisioning ----------------------------------------------------------

def test_provision_new_user():
    user = provisioning.match_or_provision(
        {'email': 'New.User@icosnet.demo', 'email_verified': True,
         'given_name': 'New', 'family_name': 'User'}
    )
    assert user.pk and user.email == 'new.user@icosnet.demo'
    assert user.role == Role.USER          # role is NEVER taken from claims
    assert user.first_name == 'New' and user.last_name == 'User'
    assert user.is_active
    assert not user.has_usable_password()


def test_match_existing_user_preserves_role_and_data():
    existing = User.objects.create_user(
        email='boss@icosnet.demo', password='password123',
        role=Role.ADMIN, first_name='Real', last_name='Boss',
    )
    user = provisioning.match_or_provision(
        {'email': 'BOSS@icosnet.demo', 'email_verified': True,
         'given_name': 'Spoofed', 'family_name': 'Name'}
    )
    assert user.pk == existing.pk
    assert user.role == Role.ADMIN          # not downgraded
    assert user.first_name == 'Real'        # managed data not clobbered


def test_provision_name_split_from_name_claim():
    user = provisioning.match_or_provision(
        {'email': 'split@icosnet.demo', 'email_verified': True, 'name': 'Marie Claire Dubois'}
    )
    assert user.first_name == 'Marie' and user.last_name == 'Claire Dubois'


def test_provision_ignores_department_claim():
    # department is an access-control axis and must NOT be derived from a claim.
    user = provisioning.match_or_provision(
        {'email': 'dept@icosnet.demo', 'email_verified': True,
         'name': 'D', 'department': 'Engineering'}
    )
    assert user.department is None
    assert not Department.objects.filter(name='Engineering').exists()


def test_provision_missing_email_raises():
    with pytest.raises(ValueError):
        provisioning.match_or_provision({'name': 'No Email', 'email_verified': True})


def test_provision_unverified_email_rejected():
    # nOAuth guard: an unverified email claim must never match or create an account.
    with pytest.raises(ValueError):
        provisioning.match_or_provision(
            {'email': 'attacker@icosnet.demo', 'email_verified': False, 'name': 'A'}
        )


def test_provision_missing_email_verified_rejected():
    with pytest.raises(ValueError):
        provisioning.match_or_provision({'email': 'x@icosnet.demo', 'name': 'X'})


# --- id_token verification (real RS256) ------------------------------------

def test_verify_valid_token():
    claims = oidc.verify_id_token(make_id_token(nonce='abc'), 'abc')
    assert claims['email'] == 'sso.user@icosnet.demo'


def test_verify_nonce_mismatch_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc'), 'different')


def test_verify_expired_token_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc', exp_delta=-3600), 'abc')


def test_verify_wrong_audience_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc', aud='someone-else'), 'abc')


def test_verify_wrong_issuer_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc', iss='https://evil.test'), 'abc')


def test_verify_bad_signature_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc', key=_OTHER_PEM), 'abc')


def test_verify_alg_none_rejected():
    with pytest.raises(Exception):
        oidc.verify_id_token(make_id_token(nonce='abc', alg='none'), 'abc')


# --- login leg -------------------------------------------------------------

def test_login_disabled_returns_400(client, settings):
    settings.SSO_ENABLED = False
    resp = client.get('/api/auth/sso/login/')
    assert resp.status_code == 400


def test_login_redirects_and_persists_state(client, monkeypatch):
    monkeypatch.setattr(
        oidc, 'authorization_url', lambda state, nonce, challenge: 'https://idp.test/authorize?x=1'
    )
    resp = client.get('/api/auth/sso/login/')
    assert resp.status_code == 302
    assert resp['Location'].startswith('https://idp.test/authorize')
    assert SsoAuthRequest.objects.count() == 1
    # binds the flow to this browser: a state cookie matching the persisted state
    state = SsoAuthRequest.objects.get().state
    assert resp.cookies[SSO_STATE_COOKIE].value == state


# --- callback leg ----------------------------------------------------------

def _stub_exchange(monkeypatch, id_token):
    monkeypatch.setattr(oidc, 'exchange_code', lambda code, verifier: {'id_token': id_token})


def _bind(client, state):
    """Simulate the browser presenting the state cookie set at /login/."""
    client.cookies[SSO_STATE_COOKIE] = state


def test_callback_provisions_and_hands_off(client, monkeypatch):
    SsoAuthRequest.objects.create(
        state='st1', nonce='n1', code_verifier='v1',
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    _stub_exchange(monkeypatch, make_id_token(
        nonce='n1', email='callback.user@icosnet.demo', given_name='Call', family_name='Back',
    ))
    _bind(client, 'st1')
    resp = client.get('/api/auth/sso/callback/', {'state': 'st1', 'code': 'authcode'})
    assert resp.status_code == 302
    assert '/sso/complete?code=' in resp['Location']
    assert User.objects.filter(email='callback.user@icosnet.demo').exists()
    assert SsoHandoffCode.objects.count() == 1
    assert not SsoAuthRequest.objects.filter(state='st1').exists()  # consumed


def test_callback_state_cookie_mismatch_rejected(client, monkeypatch):
    # Login-CSRF: a forged callback delivered to a victim carries no matching cookie.
    SsoAuthRequest.objects.create(
        state='stX', nonce='n', code_verifier='v',
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    _stub_exchange(monkeypatch, make_id_token(nonce='n', email='csrf@icosnet.demo'))
    _bind(client, 'attacker-different-value')
    resp = client.get('/api/auth/sso/callback/', {'state': 'stX', 'code': 'x'})
    assert 'error=sso_failed' in resp['Location']
    assert SsoHandoffCode.objects.count() == 0
    assert SsoAuthRequest.objects.filter(state='stX').exists()  # rejected before consume


def test_callback_unknown_state_rejected(client, monkeypatch):
    _stub_exchange(monkeypatch, make_id_token(nonce='n1'))
    _bind(client, 'forged')  # cookie matches query so we exercise the missing-authreq path
    resp = client.get('/api/auth/sso/callback/', {'state': 'forged', 'code': 'x'})
    assert resp.status_code == 302 and 'error=sso_failed' in resp['Location']
    assert SsoHandoffCode.objects.count() == 0
    assert User.objects.count() == 0


def test_callback_nonce_mismatch_rejected(client, monkeypatch):
    SsoAuthRequest.objects.create(
        state='st2', nonce='right', code_verifier='v',
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    _stub_exchange(monkeypatch, make_id_token(nonce='wrong', email='n@icosnet.demo'))
    _bind(client, 'st2')
    resp = client.get('/api/auth/sso/callback/', {'state': 'st2', 'code': 'x'})
    assert 'error=sso_failed' in resp['Location']
    assert SsoHandoffCode.objects.count() == 0


def test_callback_state_is_single_use(client, monkeypatch):
    SsoAuthRequest.objects.create(
        state='st3', nonce='n', code_verifier='v',
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    _stub_exchange(monkeypatch, make_id_token(nonce='n', email='s@icosnet.demo'))
    _bind(client, 'st3')
    first = client.get('/api/auth/sso/callback/', {'state': 'st3', 'code': 'x'})
    assert '/sso/complete?code=' in first['Location']
    _bind(client, 'st3')  # re-present cookie so we test STATE single-use, not the cookie
    replay = client.get('/api/auth/sso/callback/', {'state': 'st3', 'code': 'x'})
    assert 'error=sso_failed' in replay['Location']  # state already consumed


def test_callback_inactive_user_rejected(client, monkeypatch):
    user = User.objects.create_user(email='inactive@icosnet.demo', password='password123')
    user.is_active = False
    user.save()
    SsoAuthRequest.objects.create(
        state='st4', nonce='n', code_verifier='v',
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    _stub_exchange(monkeypatch, make_id_token(nonce='n', email='inactive@icosnet.demo'))
    _bind(client, 'st4')
    resp = client.get('/api/auth/sso/callback/', {'state': 'st4', 'code': 'x'})
    assert 'error=sso_failed' in resp['Location']
    assert SsoHandoffCode.objects.count() == 0


# --- exchange leg ----------------------------------------------------------

def _handoff(user, code='hc', **kw):
    return SsoHandoffCode.objects.create(
        code=code, user=user,
        expires_at=kw.get('expires_at', timezone.now() + timedelta(seconds=120)),
        used_at=kw.get('used_at'),
    )


def test_exchange_mints_login_shaped_response(client):
    user = User.objects.create_user(
        email='ex@icosnet.demo', password='password123', first_name='Ex', last_name='Change',
    )
    _handoff(user, code='hc1')
    resp = client.post('/api/auth/sso/exchange/', {'code': 'hc1'}, format='json')
    assert resp.status_code == 200, resp.data
    assert 'access' in resp.data and 'refresh' in resp.data
    assert resp.data['user']['email'] == 'ex@icosnet.demo'


def test_exchange_is_single_use(client):
    user = User.objects.create_user(email='ex2@icosnet.demo', password='password123')
    _handoff(user, code='hc2')
    assert client.post('/api/auth/sso/exchange/', {'code': 'hc2'}, format='json').status_code == 200
    assert client.post('/api/auth/sso/exchange/', {'code': 'hc2'}, format='json').status_code == 400


def test_exchange_expired_code_rejected(client):
    user = User.objects.create_user(email='ex3@icosnet.demo', password='password123')
    _handoff(user, code='hc3', expires_at=timezone.now() - timedelta(seconds=1))
    resp = client.post('/api/auth/sso/exchange/', {'code': 'hc3'}, format='json')
    assert resp.status_code == 400


def test_exchange_unknown_code_rejected(client):
    resp = client.post('/api/auth/sso/exchange/', {'code': 'nope'}, format='json')
    assert resp.status_code == 400


def test_exchange_inactive_user_rejected(client):
    user = User.objects.create_user(email='ex4@icosnet.demo', password='password123')
    user.is_active = False
    user.save()
    _handoff(user, code='hc4')
    resp = client.post('/api/auth/sso/exchange/', {'code': 'hc4'}, format='json')
    assert resp.status_code == 400


def test_exchange_ignores_stale_bearer_token(client):
    # authentication_classes=[] — a stale/invalid Bearer token in localStorage must
    # not 401 the public hand-off (the SPA axios client attaches it to every request).
    user = User.objects.create_user(email='stale@icosnet.demo', password='password123')
    _handoff(user, code='hcstale')
    client.credentials(HTTP_AUTHORIZATION='Bearer this.is.a.garbage.token')
    resp = client.post('/api/auth/sso/exchange/', {'code': 'hcstale'}, format='json')
    assert resp.status_code == 200, resp.data
    assert 'access' in resp.data


# --- demo IdP mounting guard ----------------------------------------------

def test_demo_idp_not_mounted_under_test(client):
    resp = client.get('/oidc-demo/.well-known/openid-configuration')
    assert resp.status_code == 404
