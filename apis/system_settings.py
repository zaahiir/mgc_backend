import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection


def _fernet():
    """Derive a Fernet key from the Django SECRET_KEY so no extra env var is needed.

    SECRET_KEY must stay in the environment (it signs JWTs/sessions), so it is a
    stable anchor for encrypting DB-stored secrets. Rotating SECRET_KEY will make
    previously stored secrets undecryptable - rotate those manually too.
    """
    digest = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plaintext):
    if not plaintext:
        return ''
    return _fernet().encrypt(plaintext.encode('utf-8')).decode('utf-8')


def decrypt_secret(ciphertext):
    if not ciphertext:
        return ''
    return _fernet().decrypt(ciphertext.encode('utf-8')).decode('utf-8')


def _ensure_encrypted(value):
    """Return `value` encrypted if it is plaintext, unchanged if already ciphertext."""
    if not value:
        return ''
    try:
        decrypt_secret(value)
        return value
    except Exception:
        return encrypt_secret(value)


def invalidate_cache(*args, **kwargs):
    get_setting.cache_clear()


@lru_cache(maxsize=256)
def get_setting(key, default=None):
    """Read an admin-managed setting, decrypting it when stored as a secret.

    Falls back to the supplied `default` when the key is absent or empty, which
    lets the app boot and keep working until an admin fills in the DB value.
    """
    from .models import SystemSetting

    try:
        obj = SystemSetting.objects.only('value', 'is_secret').get(key=key)
    except SystemSetting.DoesNotExist:
        return default

    if not obj.value:
        return default

    if obj.is_secret:
        try:
            return decrypt_secret(obj.value)
        except Exception:
            return default

    return obj.value


def set_setting(key, value, is_secret=False, description=None):
    """Create or update an admin-managed setting (encrypts secret values)."""
    from .models import SystemSetting

    stored = encrypt_secret(value) if is_secret and value else value
    defaults = {'value': stored, 'is_secret': is_secret}
    if description:
        defaults['description'] = description
    obj, _ = SystemSetting.objects.update_or_create(key=key, defaults=defaults)
    return obj


def get_smtp_config():
    """SMTP configuration from admin-managed settings, falling back to settings.py."""
    return {
        'host': get_setting('SMTP_HOST', settings.EMAIL_HOST),
        'port': int(get_setting('SMTP_PORT', settings.EMAIL_PORT or 587)),
        'username': get_setting('SMTP_USERNAME', settings.EMAIL_HOST_USER),
        'password': get_setting('SMTP_PASSWORD', settings.EMAIL_HOST_PASSWORD),
        'use_tls': str(get_setting('SMTP_USE_TLS', True)).lower() == 'true',
        'from_email': get_setting('SMTP_FROM_EMAIL', settings.DEFAULT_FROM_EMAIL),
    }


def get_mail_connection(fail_silently=False):
    cfg = get_smtp_config()
    return get_connection(
        host=cfg['host'],
        port=cfg['port'],
        username=cfg['username'],
        password=cfg['password'],
        use_tls=cfg['use_tls'],
        fail_silently=fail_silently,
    )


def send_email(subject, text_message, to, html_message=None, attachments=None, fail_silently=False):
    """Send email through the admin-managed SMTP config.

    `attachments` is a list of (filename, data, mime_type) tuples.
    """
    cfg = get_smtp_config()
    connection = get_mail_connection(fail_silently=fail_silently)
    try:
        msg = EmailMultiAlternatives(
            subject,
            text_message,
            cfg['from_email'],
            [to],
            connection=connection,
        )
        if html_message:
            msg.attach_alternative(html_message, 'text/html')
        for name, data, mime_type in (attachments or []):
            msg.attach(name, data, mime_type)
        return msg.send(fail_silently=fail_silently)
    finally:
        connection.close()
