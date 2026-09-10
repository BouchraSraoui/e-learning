import hashlib
import hmac
import secrets

from django.conf import settings
from django.db import models


class EnrollmentStatus(models.TextChoices):
    NOT_STARTED = 'not_started', 'Not started'
    IN_PROGRESS = 'in_progress', 'In progress'
    COMPLETED = 'completed', 'Completed'


class Enrollment(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments'
    )
    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='enrollments'
    )
    status = models.CharField(
        max_length=16, choices=EnrollmentStatus.choices, default=EnrollmentStatus.NOT_STARTED
    )
    progress = models.PositiveSmallIntegerField(default=0, help_text='0–100 percent.')
    last_lesson = models.ForeignKey(
        'courses.Lesson', on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('user', 'course')]
        ordering = ['-enrolled_at']
        indexes = [models.Index(fields=['user', 'status'])]

    def __str__(self):
        return f'{self.user} · {self.course} ({self.progress}%)'


class Assignment(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments'
    )
    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assignments_made',
    )
    due_date = models.DateField(null=True, blank=True)
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'course')]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} → {self.course}'


class LessonProgress(models.Model):

    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='lesson_progress'
    )
    lesson = models.ForeignKey(
        'courses.Lesson', on_delete=models.CASCADE, related_name='progress_records'
    )
    completed = models.BooleanField(default=False)
    resume_position_seconds = models.PositiveIntegerField(default=0)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('enrollment', 'lesson')]
        ordering = ['lesson__order', 'id']

    def __str__(self):
        return f'{self.enrollment_id}·{self.lesson_id} {"✓" if self.completed else "…"}'


def _new_certificate_code() -> str:
    raw = secrets.token_hex(6).upper()
    return f'ICO-{raw[0:4]}-{raw[4:8]}-{raw[8:12]}'


class Certificate(models.Model):

    code = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates'
    )
    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, related_name='certificates'
    )
    holder_name = models.CharField(max_length=200)
    course_title = models.CharField(max_length=200)
    issued_at = models.DateTimeField(auto_now_add=True)
    signature = models.CharField(max_length=64, editable=False, blank=True)

    class Meta:
        unique_together = [('user', 'course')]
        ordering = ['-issued_at']

    def __str__(self):
        return self.code

    def _payload(self) -> str:
        return '|'.join(
            [
                self.code,
                str(self.user_id),
                str(self.course_id),
                self.holder_name,
                self.course_title,
                self.issued_at.isoformat(),
            ]
        )

    def compute_signature(self) -> str:
        return hmac.new(
            settings.SECRET_KEY.encode(), self._payload().encode(), hashlib.sha256
        ).hexdigest()

    @property
    def is_valid(self) -> bool:
        return bool(self.signature) and hmac.compare_digest(self.signature, self.compute_signature())
