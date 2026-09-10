from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    ENROLLMENT = 'enrollment', 'Enrollment'
    CERTIFICATE = 'certificate', 'Certificate'
    BADGE = 'badge', 'Badge'
    COMMENT_REPLY = 'comment_reply', 'Comment reply'
    NEW_COURSE = 'new_course', 'New course'
    REMINDER = 'reminder', 'Reminder'
    DEADLINE = 'deadline', 'Deadline'


class Notification(models.Model):

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=400, blank=True)
    url = models.CharField(max_length=300, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'is_read'])]

    def __str__(self):
        return f'{self.recipient} · {self.title}'
