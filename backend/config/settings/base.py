from datetime import timedelta
from pathlib import Path

import environ
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env()
env_file = BASE_DIR / '.env'
if env_file.exists():
    env.read_env(str(env_file))

SECRET_KEY = env('DJANGO_SECRET_KEY', default='dev-insecure-change-me')
DEBUG = env.bool('DJANGO_DEBUG', default=False)
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]
THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'channels',
]
LOCAL_APPS = [
    'apps.common',
    'apps.accounts',
    'apps.courses',
    'apps.progress',
    'apps.assessments',
    'apps.engagement',
    'apps.community',
    'apps.notifications',
    'apps.assistant',
    'apps.sso',
]
INSTALLED_APPS = ['daphne'] + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.common.network.NetworkModeMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
    ),
}

AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr'
LANGUAGES = [('fr', 'Français'), ('ar', 'العربية'), ('en', 'English')]
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
    'DEFAULT_PAGINATION_CLASS': 'apps.common.pagination.DefaultPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/min',
        'user': '1000/day',
        'auth': '10/min',
        'verify': '30/min',
        'comment': '30/min',
        'chat': '60/min',
        'notifications': '240/min',
        'assistant': '30/min',
        'sso': '30/min',
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.common.exceptions.api_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Icosnet Training Platform API',
    'DESCRIPTION': 'Internal LMS for Icosnet — learners, courses, progress, certificates.',
    'VERSION': '0.1.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:3000', 'http://127.0.0.1:3000'],
)
CORS_ALLOW_CREDENTIALS = True
# Allow the demo On-net/Off-net toggle to send its simulated-origin header through the
# CORS preflight (see apps/common/network.py). Harmless in prod, where the header is
# ignored and the mode comes from the real client IP.
from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOW_HEADERS = (*default_headers, 'x-access-mode')

REDIS_URL = env('REDIS_URL', default='')
CELERY_BROKER_URL = REDIS_URL or 'memory://'
CELERY_RESULT_BACKEND = REDIS_URL or 'cache+memory://'
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=not bool(REDIS_URL))
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    'inactivity-reminders': {
        'task': 'apps.notifications.tasks.send_inactivity_reminders',
        'schedule': crontab(hour=8, minute=0),
    },
    'mandatory-deadline-reminders': {
        'task': 'apps.notifications.tasks.send_mandatory_reminders',
        'schedule': crontab(hour=8, minute=30),
    },
}

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}

# Assistant RAG (docs/PHASE-7-RAG.md) — embeddings + generation served by Ollama.
# When the backend is unreachable, the assistant degrades to the keyword FAQ engine.
ASSISTANT_RAG_ENABLED = env.bool('ASSISTANT_RAG_ENABLED', default=True)
ASSISTANT_OLLAMA_URL = env('ASSISTANT_OLLAMA_URL', default='http://localhost:11434')
# Optional secondary Ollama, tried automatically when ASSISTANT_OLLAMA_URL is
# unreachable — e.g. a dev GPU tunnel (Kaggle/cloudflared) whose quick-tunnel URL
# rotated or died. Point ASSISTANT_OLLAMA_URL at the tunnel and this at the local
# Ollama, and a dead tunnel silently degrades to local instead of dropping the whole
# assistant to the offline FAQ — no scramble to paste a fresh URL. Empty (the default,
# and what ships) disables it: the client just runs one local Ollama.
ASSISTANT_OLLAMA_FALLBACK_URL = env('ASSISTANT_OLLAMA_FALLBACK_URL', default='')
ASSISTANT_EMBED_MODEL = env('ASSISTANT_EMBED_MODEL', default='bge-m3')
# Generation model (Ollama). qwen2.5:7b — clean, reliable grounded FR/EN answers,
# ~45s/answer warm on this no-GPU box. qwen3:4b was benchmarked here (15 Jul 2026) and
# REJECTED: it's reasoning-first, Ollama 0.32 ignores `think:false`, its `/no_think`
# soft-switch is unreliable through the long RAG prompt, and it ran 65-190s (slower —
# grounded calls even timed out). Qwen3 only makes sense on a GPU. Real speed/quality
# beyond this needs a GPU or a cloud LLMClient (both gated on Loi 18-07 / D2). Set
# ASSISTANT_LLM_MODEL=qwen2.5:3b to trade quality for a bit more speed.
ASSISTANT_LLM_MODEL = env('ASSISTANT_LLM_MODEL', default='qwen2.5:7b')
# When a reasoning model IS used (e.g. qwen3 on a GPU box), False makes OllamaLLMClient
# append `/no_think` so it answers directly. Dormant for non-reasoning models.
ASSISTANT_LLM_THINK = env.bool('ASSISTANT_LLM_THINK', default=False)
ASSISTANT_EMBED_CLIENT = env(
    'ASSISTANT_EMBED_CLIENT', default='apps.assistant.clients.OllamaEmbeddingClient'
)
ASSISTANT_LLM_CLIENT = env(
    'ASSISTANT_LLM_CLIENT', default='apps.assistant.clients.OllamaLLMClient'
)
ASSISTANT_SIMILARITY_THRESHOLD = env.float('ASSISTANT_SIMILARITY_THRESHOLD', default=0.55)
ASSISTANT_RAG_TOP_K = env.int('ASSISTANT_RAG_TOP_K', default=5)
# How many retrieved chunks may enter the prompt. This is THE latency knob: measured
# on this box (20 Jul 2026) qwen2.5:7b prefills at ~9.4 tokens/s, so every extra
# ~700-char chunk adds roughly 23s to the answer. Two chunks of the paragraph-sized
# corpus (see chunker.MAX_CHARS) carry one topic each, which is what most questions
# need; raise it for completeness at a very real cost in seconds.
ASSISTANT_RAG_MAX_CONTEXT = env.int('ASSISTANT_RAG_MAX_CONTEXT', default=2)
# Ollama unloads a model after 5 minutes idle by default, so the first question of
# every session paid a ~4.7 GB reload. Pinning both models in RAM removes that cold
# start (client remark round 2). Set to '0' to release them immediately instead.
ASSISTANT_OLLAMA_KEEP_ALIVE = env('ASSISTANT_OLLAMA_KEEP_ALIVE', default='60m')
# Decode cap. The system prompt asks for 1-4 sentences (~120 tokens); 192 leaves
# headroom without letting a rambling answer burn minutes of CPU decode.
ASSISTANT_LLM_NUM_PREDICT = env.int('ASSISTANT_LLM_NUM_PREDICT', default=192)
# Context window, sized to the real prompt (system + user facts + at most
# ASSISTANT_RAG_MAX_CONTEXT chunks of ~1000 chars) ≈ 1400 tokens, with headroom.
# It must stay >= the real prompt: Ollama silently truncates anything longer, and
# what it drops first is the system prompt. Raise it alongside
# ASSISTANT_RAG_MAX_CONTEXT or chunker.MAX_CHARS, never below them.
ASSISTANT_LLM_NUM_CTX = env.int('ASSISTANT_LLM_NUM_CTX', default=3072)

EMAIL_BACKEND = env(
    'EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend'
)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='no-reply@gmail.com')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')

# --- SSO / OIDC (relying party) ---
# Provider-agnostic OpenID Connect login. Off by default; dev.py points it at the
# bundled demo IdP, prod supplies the real Icosnet issuer/credentials. Only these
# settings change between demo and production — the code never does.
SSO_ENABLED = env.bool('SSO_ENABLED', default=False)
SSO_ISSUER = env('SSO_OIDC_ISSUER', default='http://localhost:8000/oidc-demo')
SSO_DISCOVERY_URL = env(
    'SSO_OIDC_DISCOVERY_URL',
    default='http://localhost:8000/oidc-demo/.well-known/openid-configuration',
)
SSO_CLIENT_ID = env('SSO_OIDC_CLIENT_ID', default='demo-client')
SSO_CLIENT_SECRET = env('SSO_OIDC_CLIENT_SECRET', default='demo-secret')
SSO_REDIRECT_URI = env(
    'SSO_OIDC_REDIRECT_URI', default='http://localhost:8000/api/auth/sso/callback/'
)
SSO_SCOPES = env('SSO_OIDC_SCOPES', default='openid email profile')
# 'client_secret_post' (creds in body) or 'client_secret_basic' (HTTP Basic).
SSO_TOKEN_AUTH_METHOD = env('SSO_OIDC_TOKEN_AUTH_METHOD', default='client_secret_post')

# --- Demo IdP (fake OpenID provider — DEV ONLY, never mounted in test/prod) ---
SSO_DEMO_IDP = env.bool('SSO_DEMO_IDP', default=False)
SSO_DEMO_ISSUER = env('SSO_DEMO_ISSUER', default='http://localhost:8000/oidc-demo')
# PEM RSA private key; empty ⇒ an ephemeral in-process key is generated (dev demo).
SSO_DEMO_SIGNING_KEY = env('SSO_DEMO_SIGNING_KEY', default='')

# --- On-net / Off-net access mode (spec 2.6.2) ---
# Recognises where the user reaches the platform from: on-net = inside the internal
# Icosnet network; off-net = secured external access (VPN / controlled access). Like
# the SSO block above, only these settings change between demo and production — the
# middleware code (apps/common/network.py) is the same. In production the mode is
# derived from the real client IP against NET_ONNET_CIDRS. In the dev demo
# (NET_MODE_DEMO + DEBUG only) it is driven by a simulated-origin header from the
# front-end toggle so the flow can be shown without the real LAN/VPN; that header is
# NOT a security boundary (a client can send any value), exactly like the demo IdP.
NET_MODE_DEMO = env.bool('NET_MODE_DEMO', default=False)
NET_ONNET_CIDRS = env.list('NET_ONNET_CIDRS', default=[])
NET_TRUST_FORWARDED_FOR = env.bool('NET_TRUST_FORWARDED_FOR', default=False)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '[{levelname}] {asctime} {name} — {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'root': {'handlers': ['console'], 'level': env('LOG_LEVEL', default='INFO')},
}
