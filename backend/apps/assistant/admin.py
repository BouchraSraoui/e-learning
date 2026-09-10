from django.contrib import admin

from .models import FaqEntry


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ('question', 'category', 'order', 'is_published', 'updated_at')
    list_filter = ('is_published', 'category')
    search_fields = ('question', 'answer')
    ordering = ('order', 'id')
