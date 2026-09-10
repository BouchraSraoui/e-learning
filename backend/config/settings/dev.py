from .base import *  # noqa: F401,F403
from .base import env

DEBUG = env.bool('DJANGO_DEBUG', default=True)
ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

# SSO on and pointed at the bundled demo IdP out-of-the-box (dev only).
SSO_ENABLED = True
SSO_DEMO_IDP = True

# Pin the demo handshake to the literal 127.0.0.1 (not "localhost"). The relying
# party makes blocking server-to-server calls (discovery, token, JWKS) back to the
# co-hosted demo IdP; the dev server (daphne) listens on IPv4 127.0.0.1 only, but on
# Windows "localhost" resolves to IPv6 ::1 first, so every self-request stalls ~2s
# (or times out entirely) failing the ::1 attempt before falling back — which is what
# surfaced to the client as "/sso/complete?error=sso_failed". A literal IP skips name
# resolution and the doomed IPv6 hop. Browser + server all use one host, so the login
# state cookie stays same-site. Prod never uses these (real issuer comes from env).
SSO_ISSUER = 'http://127.0.0.1:8000/oidc-demo'
SSO_DISCOVERY_URL = 'http://127.0.0.1:8000/oidc-demo/.well-known/openid-configuration'
SSO_REDIRECT_URI = 'http://127.0.0.1:8000/api/auth/sso/callback/'
SSO_DEMO_ISSUER = 'http://127.0.0.1:8000/oidc-demo'

# On-net/Off-net access mode simulated by the front-end toggle out-of-the-box (dev
# only). With no NET_ONNET_CIDRS configured the real-IP path would fail closed to
# off-net; the demo header path makes the toggle authoritative instead.
NET_MODE_DEMO = True

REST_FRAMEWORK = {**REST_FRAMEWORK}  # noqa: F405
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '120/min',
    'user': '10000/day',
    'auth': '60/min',
    'verify': '120/min',
    'comment': '120/min',
    'chat': '240/min',
    'notifications': '480/min',
    'assistant': '120/min',
    'sso': '120/min',
}
