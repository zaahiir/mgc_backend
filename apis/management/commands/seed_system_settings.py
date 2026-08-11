from django.conf import settings
from django.core.management.base import BaseCommand

from apis.models import SystemSetting
from apis.system_settings import set_setting

DEFAULT_KEYS = [
    ('SMTP_HOST', settings.EMAIL_HOST, False, 'SMTP server hostname'),
    ('SMTP_PORT', str(settings.EMAIL_PORT or 587), False, 'SMTP server port'),
    ('SMTP_USERNAME', settings.EMAIL_HOST_USER, False, 'SMTP login username / email address'),
    ('SMTP_PASSWORD', settings.EMAIL_HOST_PASSWORD, True, 'SMTP mail app password (stored encrypted)'),
    ('SMTP_USE_TLS', 'true', False, 'Use TLS for SMTP (true/false)'),
    ('SMTP_FROM_EMAIL', settings.DEFAULT_FROM_EMAIL, False, 'From address used for outgoing email'),
    ('TINYMCE_API_KEY', '', True, 'TinyMCE API key (stored encrypted)'),
]


class Command(BaseCommand):
    help = (
        'Seed admin-managed SystemSetting rows (API keys, SMTP). Values are pulled '
        'from the current environment as initial values, then managed from Django '
        'admin. Run once on deploy; re-run only creates missing keys.'
    )

    def handle(self, *args, **options):
        for key, value, is_secret, description in DEFAULT_KEYS:
            obj, created = SystemSetting.objects.get_or_create(
                key=key,
                defaults={'description': description, 'is_secret': is_secret},
            )
            if created:
                set_setting(key, value, is_secret=is_secret, description=description)
                self.stdout.write(self.style.SUCCESS(f'Created {key}'))
            else:
                self.stdout.write(self.style.WARNING(f'Exists (skipped) {key}'))
