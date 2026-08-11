from django.apps import AppConfig
from django.db.models.signals import post_delete, post_save


class ApisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apis'

    def ready(self):
        from . import system_settings
        from .models import SystemSetting

        post_save.connect(
            receiver=system_settings.invalidate_cache,
            sender=SystemSetting,
            dispatch_uid='systemsetting_invalidate_cache_save',
        )
        post_delete.connect(
            receiver=system_settings.invalidate_cache,
            sender=SystemSetting,
            dispatch_uid='systemsetting_invalidate_cache_delete',
        )
