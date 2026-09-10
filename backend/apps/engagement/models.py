from django.conf import settings
from django.db import models


class Comment(models.Model):

    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='comments'
    )
    lesson = models.ForeignKey(
        'courses.Lesson', on_delete=models.CASCADE, null=True, blank=True, related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies'
    )
    body = models.TextField(max_length=2000)
    is_hidden = models.BooleanField(default=False)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [models.Index(fields=['course', 'created_at'])]

    def __str__(self):
        return f'{self.author} · {self.body[:40]}'


class Reaction(models.Model):

    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reactions'
    )
    emoji = models.CharField(max_length=8)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('comment', 'user', 'emoji')]
        ordering = ['id']

    def __str__(self):
        return f'{self.user} {self.emoji} #{self.comment_id}'


class Feedback(models.Model):

    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedback'
    )
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('user', 'course')]
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.user} · {self.course} ({self.rating}★)'


class Badge(models.Model):

    code = models.SlugField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    icon = models.CharField(max_length=40, default='award')
    accent = models.CharField(max_length=16, default='primary')
    points = models.PositiveIntegerField(default=50)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class UserBadge(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_badges'
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awards')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'badge')]
        ordering = ['-earned_at']

    def __str__(self):
        return f'{self.user} · {self.badge}'
