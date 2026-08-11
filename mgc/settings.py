from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path):
    """Populate os.environ from a KEY=VALUE file.

    Deliberately dependency-free so deployment does not need python-dotenv.
    Existing environment variables always win, so a real environment (Plesk,
    systemd, docker) overrides the file rather than the other way round.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(BASE_DIR / '.env')


class ImproperlyConfigured(Exception):
    """Raised at import time when a production secret is missing."""


# Environment detection.
# Defaults to 'production' so that a forgotten env var fails closed (DEBUG off,
# secrets required) instead of silently shipping a debug build.
ENVIRONMENT = os.getenv('DJANGO_ENVIRONMENT', 'production').lower()
IS_PRODUCTION = ENVIRONMENT == 'production'

DEBUG = not IS_PRODUCTION


def require_env(name, dev_default=None):
    """Read a secret from the environment.

    In production a missing value is fatal. Outside production we fall back to
    a throwaway development value so that a fresh checkout still runs.
    """
    value = os.getenv(name)
    if value:
        return value
    if IS_PRODUCTION:
        raise ImproperlyConfigured(
            f'{name} must be set in the environment when '
            f'DJANGO_ENVIRONMENT=production.'
        )
    return dev_default


# SECURITY: no hard-coded fallback in production. The previous literal key is
# burned (it is in git history) and must not be reused.
SECRET_KEY = require_env('DJANGO_SECRET_KEY', 'dev-only-insecure-key-not-for-production')

ALLOWED_HOSTS = [
    h.strip() for h in os.getenv(
        'DJANGO_ALLOWED_HOSTS',
        'mastergolfclub.com,www.mastergolfclub.com,admin.mastergolfclub.com,'
        'member.mastergolfclub.com,217.154.58.195,localhost,127.0.0.1',
    ).split(',') if h.strip()
]

FRONTEND_URL = os.getenv('DJANGO_FRONTEND_URL', 'https://member.mastergolfclub.com')

# ---------------------------------------------------------------------------
# Transport security
# ---------------------------------------------------------------------------
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Was False while HSTS preload was advertised, which tells browsers to use
# HTTPS but still serves the first plaintext hop.
SECURE_SSL_REDIRECT = IS_PRODUCTION
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SECURE_HSTS_SECONDS = 31536000 if IS_PRODUCTION else 0
SECURE_HSTS_PRELOAD = IS_PRODUCTION
SECURE_HSTS_INCLUDE_SUBDOMAINS = IS_PRODUCTION

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

# Cap request bodies so an unauthenticated POST cannot exhaust memory/disk.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024      # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024      # 10 MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
MAX_UPLOAD_SIZE = int(os.getenv('DJANGO_MAX_UPLOAD_SIZE', str(5 * 1024 * 1024)))  # 5 MB per file

# ---------------------------------------------------------------------------
# CORS / CSRF origins
# ---------------------------------------------------------------------------
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        'DJANGO_CORS_ALLOWED_ORIGINS',
        'https://mastergolfclub.com,https://www.mastergolfclub.com,'
        'https://admin.mastergolfclub.com,https://member.mastergolfclub.com',
    ).split(',') if o.strip()
]

if not IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS += ['http://localhost:4200', 'http://localhost:4300']

CSRF_TRUSTED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS if o.startswith('https://')]

CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cache-control',
    'pragma',
    'expires',
]

CORS_PREFLIGHT_MAX_AGE = 86400

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'apis',
    'tinymce',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'mgc.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.static',
            ],
        },
    },
]

WSGI_APPLICATION = 'mgc.wsgi.application'

if IS_PRODUCTION:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DJANGO_DB_NAME', 'admin_mgc'),
            'USER': os.getenv('DJANGO_DB_USER', 'mgc_admin'),
            'PASSWORD': require_env('DJANGO_DB_PASSWORD'),
            'HOST': os.getenv('DJANGO_DB_HOST', 'localhost'),
            'PORT': os.getenv('DJANGO_DB_PORT', '3306'),
            'OPTIONS': {'charset': 'utf8mb4'},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 10},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apis.authentication.RoleAwareJWTAuthentication',
    ],
    # SECURITY: the absence of this key previously left every endpoint on
    # DRF's AllowAny default. Endpoints that are genuinely public opt in
    # explicitly via each ViewSet's permission_map.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'apis.utils.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('DJANGO_THROTTLE_ANON', '60/min'),
        'user': os.getenv('DJANGO_THROTTLE_USER', '1000/hour'),
        # Credential-facing endpoints. These stop the reset-code brute force.
        'login': '10/min',
        'password_reset': '5/hour',
        'reset_verify': '10/hour',
        'enquiry': '10/hour',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=8),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.getenv(
    'DJANGO_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.getenv('DJANGO_EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('DJANGO_EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('DJANGO_EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('DJANGO_EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = require_env('DJANGO_EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DJANGO_DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
SERVER_EMAIL = DEFAULT_FROM_EMAIL
EMAIL_TIMEOUT = int(os.getenv('DJANGO_EMAIL_TIMEOUT', '30'))

# ---------------------------------------------------------------------------
# Obfuscated Django admin / TinyMCE mount points
# ---------------------------------------------------------------------------
# The stock '/admin/' path is a well-known attack surface. Mount the Django
# admin under a less guessable prefix (override in .env). TinyMCE's upload
# endpoint is folded under the same prefix and remains staff-only.
DJANGO_ADMIN_URL = os.getenv('DJANGO_ADMIN_URL', 'mastergolf-admin-console').strip('/')

LANGUAGE_CODE = 'en-gb'
TIME_ZONE = 'Europe/London'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'

if IS_PRODUCTION:
    STATIC_ROOT = os.getenv(
        'DJANGO_STATIC_ROOT',
        '/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/static',
    )
    MEDIA_ROOT = os.getenv(
        'DJANGO_MEDIA_ROOT',
        '/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media',
    )
else:
    STATIC_ROOT = os.path.join(BASE_DIR, 'static/')
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

STATICFILES_DIRS = [os.path.join(BASE_DIR, 'staticfiles')]

MEDIA_URL = '/media/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

MIME_TYPES = {
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
}

# Uploads are user-controlled; only these are ever accepted.
ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {'format': '[{asctime}] {levelname} {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG' if DEBUG else 'INFO',
    },
}
