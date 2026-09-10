from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class Role(models.TextChoices):
    USER = 'user', 'User'
    MANAGER = 'manager', 'Manager'
    ADMIN = 'admin', 'Administrator'


class Language(models.TextChoices):
    FR = 'fr', 'Français'
    AR = 'ar', 'العربية'
    EN = 'en', 'English'


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=120)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='teams', null=True, blank=True
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):

    username = None
    email = models.EmailField('email address', unique=True)

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='members'
    )
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='members'
    )
    manager = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )

    job_title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    location = models.CharField(max_length=120, blank=True)
    bio = models.TextField(max_length=280, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.FR)
    email_notifications = models.BooleanField(default=True)

    courses_in_progress = models.PositiveIntegerField(default=0)
    courses_completed = models.PositiveIntegerField(default=0)
    certificates_count = models.PositiveIntegerField(default=0)
    learning_minutes = models.PositiveIntegerField(default=0)
    avg_quiz_score = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=0)
    badge_points = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if self.role == Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    @property
    def full_name(self) -> str:
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_admin_role(self) -> bool:
        return self.role == Role.ADMIN or self.is_superuser

    @property
    def is_manager_role(self) -> bool:
        return self.role == Role.MANAGER


class AuditLog(models.Model):

    actor = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='audit_events',
    )
    action = models.CharField(max_length=64, db_index=True)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    target_repr = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]

    def __str__(self):
        return f'{self.action} by {self.actor_id} @ {self.created_at:%Y-%m-%d %H:%M}'
