from .base import *  # noqa: F401,F403

DEBUG = False
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
CELERY_TASK_ALWAYS_EAGER = True
CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}

REST_FRAMEWORK = {**REST_FRAMEWORK}  # noqa: F405
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = ()
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}

# RAG stays off in tests (no network); RAG tests opt in with stub clients.
ASSISTANT_RAG_ENABLED = False

# The demo IdP never mounts under test (mirrors ASSISTANT_RAG_ENABLED above). RP
# tests drive the relying-party views directly with stubbed OIDC calls.
SSO_DEMO_IDP = False

# On-net/Off-net demo simulation hard-off under test; tests set it per-case and drive
# the real-IP path directly. (Mirrors SSO_DEMO_IDP above.)
NET_MODE_DEMO = False
# The test client's REMOTE_ADDR is 127.0.0.1, so treat loopback as on-net: existing
# admin/authoring tests then run on-net by default and pass. Off-net tests opt in by
# sending a non-loopback REMOTE_ADDR (e.g. client.get(url, REMOTE_ADDR='203.0.113.7')).
NET_ONNET_CIDRS = ['127.0.0.0/8', '::1/128']
