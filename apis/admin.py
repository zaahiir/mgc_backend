from django.contrib import admin
from django import forms

from .models import SystemSetting
from .system_settings import _ensure_encrypted


class SystemSettingForm(forms.ModelForm):
    class Meta:
        model = SystemSetting
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk and self.instance.is_secret:
            # Mask the stored secret - never render the ciphertext.
            self.fields['value'].widget = forms.PasswordInput(render_value=False)
            self.fields['value'].help_text = (
                'Leave blank to keep the stored secret unchanged.'
            )
        else:
            self.fields['value'].help_text = (
                'For secret keys, this value is encrypted before it is stored.'
            )

    def save(self, commit=True):
        instance = super().save(commit=False)
        raw = self.cleaned_data.get('value')
        if instance.is_secret:
            if raw:
                # New value entered: store it encrypted.
                instance.value = _ensure_encrypted(raw)
            else:
                # Blank (masked field untouched): preserve the stored ciphertext.
                instance.value = self.initial.get('value', '')
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    form = SystemSettingForm
    list_display = ('key', 'is_secret', 'description', 'updatedAt')
    list_filter = ('is_secret',)
    search_fields = ('key', 'description')
    ordering = ('key',)
