from pathlib import Path
from datetime import timedelta
import os
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-$8(gz)-bl7c23oy%br2vj%z*@tn752amdlp^o-pla&ze49-f8y')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['mastergolfclub.com', '217.154.58.195', 'localhost', '127.0.0.1', 'admin.mastergolfclub.com', 'member.mastergolfclub.com']

# For development
# FRONTEND_URL = 'http://localhost:4300'  # For local development

# Frontend URL configuration for password reset emails
FRONTEND_URL = 'https://member.mastergolfclub.com'

# HTTPS settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = False

# HSTS Settings
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# CORS Settings
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',  # For local development
    'http://localhost:4300',  # For local development
    'https://mastergolfclub.com',      # Your main domain
    'https://admin.mastergolfclub.com',      # Your main domain
    'https://member.mastergolfclub.com',      # Your main domain
    'https://www.mastergolfclub.com',  # www subdomain
    'http://217.154.58.195',   # Access via IP address
    'https://217.154.58.195',  # HTTPS version of IP
]

# CORS_ALLOW_ALL_ORIGINS = True

# More detailed CORS settings
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

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

# Add this to handle preflight requests
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

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

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': 'admin_mastergolfclub',
#         'USER': 'mgc_admin',
#         'PASSWORD': '82M^97tug',
#         'HOST': 'localhost',
#         'PORT': '3306',
#     }
# }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

REST_FRAMEWORK = {
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

# JWT Configuration for 1-hour expiry
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=2),
    # 'ACCESS_TOKEN_LIFETIME': timedelta(minutes=3),
    # 'REFRESH_TOKEN_LIFETIME': timedelta(minutes=6),
    'ROTATE_REFRESH_TOKENS': True,  # Rotate refresh tokens on each use
    'BLACKLIST_AFTER_ROTATION': True,  # Blacklist old refresh tokens
    'UPDATE_LAST_LOGIN': True,  # Update last login time
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(hours=1),  
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(hours=2),
    # 'SLIDING_TOKEN_LIFETIME': timedelta(minutes=3),
    # 'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(minutes=6),
}


ENCRYPTION_KEY = get_random_secret_key()

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'smartxoft@gmail.com'
# EMAIL_HOST_USER_PASSWORD = 'zyio jdww kyrq wcnw'
EMAIL_HOST_PASSWORD = 'zyio jdww kyrq wcnw'
DEFAULT_FROM_EMAIL = 'smartxoft@gmail.com'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = '/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/static'
# STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

# STATICFILES_DIRS = [
#     '/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/staticfiles'
# ]

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'staticfiles'),
]

MEDIA_URL = '/media/'
MEDIA_ROOT = '/var/www/vhosts/mastergolfclub.com/httpdocs/django/site/public/media'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

MIME_TYPES = {
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
}
