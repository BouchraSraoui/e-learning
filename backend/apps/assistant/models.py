from django.db import models


class Language(models.TextChoices):

    FR = 'fr', 'Français'
    EN = 'en', 'English'


class SourceType(models.TextChoices):

    FAQ = 'faq', 'FAQ entry'
    COURSE = 'course', 'Course'
    LESSON = 'lesson', 'Lesson'
    DOC = 'doc', 'Help document'


class Audience(models.TextChoices):
    """Who a chunk may be retrieved for. Blank = everyone (the default: FAQ,
    catalog and learner help). The per-role guides carry a tag so a learner is
    never answered with instructions only a manager or admin can carry out."""

    MANAGER = 'manager', 'Managers and admins'
    ADMIN = 'admin', 'Admins only'


class KnowledgeChunk(models.Model):
   

    content = models.TextField()
    embedding = models.JSONField()
    source_type = models.CharField(max_length=16, choices=SourceType.choices)
    source_id = models.CharField(max_length=64)
    chunk_index = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=255)
    url = models.CharField(max_length=255, blank=True)
    # '' = language-neutral (catalog content): retrieved for every UI locale.
    language = models.CharField(max_length=2, choices=Language.choices, blank=True, default='')
    # '' = everyone; see Audience.
    audience = models.CharField(max_length=16, choices=Audience.choices, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['source_type', 'source_id'])]

    def __str__(self):
        return f'{self.source_type}:{self.source_id}#{self.chunk_index} — {self.title}'


class FaqEntry(models.Model):

    question = models.CharField(max_length=300)
    answer = models.TextField()
    category = models.CharField(max_length=80, blank=True)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.FR)
    keywords = models.JSONField(default=list, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'FAQ entry'
        verbose_name_plural = 'FAQ entries'

    def __str__(self):
        return self.question
