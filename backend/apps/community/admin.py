from django.contrib import admin

from .models import ChatBan, ChatMessage, ChatRoom


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('slug', 'name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('slug', 'name')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'room', 'is_deleted', 'created_at')
    list_filter = ('is_deleted', 'room')
    search_fields = ('body', 'author__email')
    raw_id_fields = ('room', 'author', 'deleted_by')


@admin.register(ChatBan)
class ChatBanAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'room', 'created_by', 'created_at')
    search_fields = ('user__email', 'room__slug')
    raw_id_fields = ('room', 'user', 'created_by')
