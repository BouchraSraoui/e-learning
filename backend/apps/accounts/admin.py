from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Department, Team, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['email']
    list_display = ['email', 'first_name', 'last_name', 'role', 'department', 'is_active']
    list_filter = ['role', 'is_active', 'department']
    search_fields = ['email', 'first_name', 'last_name']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Identity', {'fields': ('first_name', 'last_name', 'role', 'department', 'team', 'manager')}),
        ('Profile', {'fields': ('job_title', 'phone', 'location', 'bio', 'avatar', 'language', 'email_notifications')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    search_fields = ['name']


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'department']
    search_fields = ['name']
