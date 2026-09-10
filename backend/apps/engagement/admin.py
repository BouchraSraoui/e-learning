from django.contrib import admin

from .models import Badge, Comment, Feedback, Reaction, UserBadge


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'course', 'lesson', 'is_hidden', 'created_at')
    list_filter = ('is_hidden', 'created_at')
    search_fields = ('body', 'author__email', 'course__title')
    raw_id_fields = ('course', 'lesson', 'author', 'parent', 'hidden_by')


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'emoji', 'comment', 'created_at')
    search_fields = ('user__email',)
    raw_id_fields = ('comment', 'user')


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'course', 'rating', 'updated_at')
    list_filter = ('rating',)
    search_fields = ('user__email', 'course__title', 'comment')
    raw_id_fields = ('course', 'user')


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'points', 'order')
    search_fields = ('code', 'name')


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'badge', 'earned_at')
    search_fields = ('user__email', 'badge__code')
    raw_id_fields = ('user', 'badge')
