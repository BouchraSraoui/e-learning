from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class QuestionType(models.TextChoices):
    SINGLE = 'single', 'Single choice'
    MULTIPLE = 'multiple', 'Multiple choice'
    TRUE_FALSE = 'true_false', 'True / false'
    DROPDOWN = 'dropdown', 'Dropdown'


class Quiz(models.Model):

    course = models.ForeignKey(
        'courses.Course', on_delete=models.CASCADE, null=True, blank=True, related_name='quizzes'
    )
    module = models.ForeignKey(
        'courses.Module', on_delete=models.CASCADE, null=True, blank=True, related_name='quizzes'
    )
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    pass_score = models.PositiveSmallIntegerField(default=70, help_text='Percent needed to pass.')
    max_attempts = models.PositiveSmallIntegerField(default=0, help_text='0 = unlimited.')
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'quizzes'
        ordering = ['id']

    def __str__(self):
        return self.title

    def clean(self):
        if bool(self.course_id) == bool(self.module_id):
            raise ValidationError('A quiz must belong to exactly one of course or module.')

    @property
    def course_ref(self):
        return self.course or (self.module.course if self.module_id else None)


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500)
    type = models.CharField(max_length=16, choices=QuestionType.choices, default=QuestionType.SINGLE)
    order = models.PositiveIntegerField(default=0)
    points = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:60]


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    text = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:60]


class QuizAttempt(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts'
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField(default=1)
    score = models.PositiveSmallIntegerField(default=0)
    passed = models.BooleanField(default=False)
    responses = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [models.Index(fields=['user', 'quiz'])]

    def __str__(self):
        return f'{self.user} · {self.quiz} #{self.attempt_number} ({self.score}%)'
