from django.contrib import admin

from .models import DemoAuthCode, SsoAuthRequest, SsoHandoffCode


@admin.register(SsoAuthRequest)
class SsoAuthRequestAdmin(admin.ModelAdmin):
    list_display = ('state', 'created_at', 'expires_at')
    readonly_fields = [f.name for f in SsoAuthRequest._meta.fields]


@admin.register(SsoHandoffCode)
class SsoHandoffCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'user', 'created_at', 'expires_at', 'used_at')
    readonly_fields = [f.name for f in SsoHandoffCode._meta.fields]


@admin.register(DemoAuthCode)
class DemoAuthCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'client_id', 'created_at', 'expires_at', 'used_at')
    readonly_fields = [f.name for f in DemoAuthCode._meta.fields]
