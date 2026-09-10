from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

SECRET_KEY = env('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS')
DATABASES = {'default': env.db('DATABASE_URL')}
REDIS_URL = env('REDIS_URL')
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_ALWAYS_EAGER = False

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [REDIS_URL]},
    }
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')

# SSO: fail fast on missing real-directory config (mirrors SECRET_KEY/DATABASE_URL
# above). The demo IdP is HARD-disabled here — never controllable by env in prod
# (base.py reads it from the environment; this literal overrides that, and
# config/urls.py additionally gates the mount on DEBUG).
SSO_DEMO_IDP = False
SSO_ENABLED = env.bool('SSO_ENABLED', default=False)

# On-net/Off-net demo simulation HARD-disabled in prod — the header is never trusted;
# the access mode always comes from the real client IP vs NET_ONNET_CIDRS (set via env).
NET_MODE_DEMO = False
if SSO_ENABLED:
    SSO_ISSUER = env('SSO_OIDC_ISSUER')
    SSO_DISCOVERY_URL = env('SSO_OIDC_DISCOVERY_URL')
    SSO_CLIENT_ID = env('SSO_OIDC_CLIENT_ID')
    SSO_CLIENT_SECRET = env('SSO_OIDC_CLIENT_SECRET')
    SSO_REDIRECT_URI = env('SSO_OIDC_REDIRECT_URI')
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
