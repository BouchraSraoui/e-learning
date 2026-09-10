from django.conf import settings
from django.db import models
from django.utils.text import slugify

from .validators import (
    sanitize_html,
    validate_lesson_file,
    validate_resource_file,
    validate_thumbnail,
)


class Level(models.TextChoices):
    BEGINNER = 'beginner', 'Beginner'
    INTERMEDIATE = 'intermediate', 'Intermediate'
    ADVANCED = 'advanced', 'Advanced'


class ContentType(models.TextChoices):
    VIDEO = 'video', 'Video'
    AUDIO = 'audio', 'Audio'
    PDF = 'pdf', 'PDF'
    SLIDES = 'slides', 'Presentation'
    TEXT = 'text', 'Rich text'


class Accent(models.TextChoices):

    PRIMARY = 'primary', 'Primary'
    BRAND = 'brand', 'Brand'
    VIOLET = 'violet', 'Violet'
    EMERALD = 'emerald', 'Emerald'
    AMBER = 'amber', 'Amber'
    ROSE = 'rose', 'Rose'


def _unique_slug(model, value: str, instance_pk=None) -> str:
    base = slugify(value)[:200] or 'item'
    slug = base
    n = 2
    qs = model.objects.all()
    if instance_pk is not None:
        qs = qs.exclude(pk=instance_pk)
    while qs.filter(slug=slug).exists():
        slug = f'{base}-{n}'
        n += 1
    return slug


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    accent = models.CharField(max_length=16, choices=Accent.choices, default=Accent.PRIMARY)
    description = models.CharField(max_length=280, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(Category, self.name, self.pk)
        super().save(*args, **kwargs)


class Course(models.Model):
    class Audience(models.TextChoices):
        OPEN = 'open', 'Open (self-service catalog)'
        GENERAL = 'general', 'General (auto-assigned to everyone)'
        DEPARTMENT = 'department', 'Department (auto-assigned to a department)'

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    summary = models.CharField(max_length=300, help_text='One-line catalog blurb.')
    description = models.TextField(blank=True)
    objectives = models.JSONField(default=list, blank=True, help_text='List of learning objectives.')

    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses'
    )
    level = models.CharField(max_length=16, choices=Level.choices, default=Level.BEGINNER)
    primary_format = models.CharField(
        max_length=16, choices=ContentType.choices, default=ContentType.VIDEO
    )
    duration_minutes = models.PositiveIntegerField(default=0)

    is_mandatory = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    issues_certificate = models.BooleanField(default=True)
    # Confidential/internal course: content, enrolment and media are locked when the
    # request is off-net (spec 2.6.2 — see apps/common/network.py). Default False =
    # normal course, reachable from anywhere.
    internal_only = models.BooleanField(default=False)

    # Who the course is for. OPEN = normal self-service catalog (default, unchanged
    # behavior). GENERAL = auto-assigned to every active user on publish. DEPARTMENT
    # = auto-assigned to members of `department` on publish. See apps/progress/signals.py.
    audience = models.CharField(
        max_length=16, choices=Audience.choices, default=Audience.OPEN
    )
    department = models.ForeignKey(
        'accounts.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_courses',
        help_text='Target department when audience is "department".',
    )

    thumbnail = models.ImageField(
        upload_to='course_thumbnails/', null=True, blank=True, validators=[validate_thumbnail]
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authored_courses',
    )
    prerequisites = models.ManyToManyField(
        'self', symmetrical=False, related_name='required_for', blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_published']),
            models.Index(fields=['level']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(Course, self.title, self.pk)
        if self.description:
            self.description = sanitize_html(self.description)
        super().save(*args, **kwargs)

    @property
    def module_count(self) -> int:
        return self.modules.count()

    @property
    def lesson_count(self) -> int:
        return Lesson.objects.filter(module__course=self).count()

    @property
    def computed_duration(self) -> int:
        agg = Lesson.objects.filter(module__course=self).aggregate(
            total=models.Sum('duration_minutes')
        )
        return agg['total'] or 0


class Module(models.Model):

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.course.title} · {self.title}'


class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content_type = models.CharField(
        max_length=16, choices=ContentType.choices, default=ContentType.VIDEO
    )
    file = models.FileField(
        upload_to='lesson_files/', null=True, blank=True, validators=[validate_lesson_file]
    )
    external_url = models.URLField(blank=True)
    rich_text = models.TextField(blank=True)

    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_preview = models.BooleanField(
        default=False, help_text='Viewable in the catalog before enrolling.'
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.rich_text:
            self.rich_text = sanitize_html(self.rich_text)
        super().save(*args, **kwargs)


class Resource(models.Model):

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=200)
    file = models.FileField(
        upload_to='resources/', null=True, blank=True, validators=[validate_resource_file]
    )
    external_url = models.URLField(blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class LearningPath(models.Model):

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    courses = models.ManyToManyField(
        Course, through='LearningPathItem', related_name='learning_paths', blank=True
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(LearningPath, self.title, self.pk)
        super().save(*args, **kwargs)


class LearningPathItem(models.Model):
    path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='path_items')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = [('path', 'course')]

    def __str__(self):
        return f'{self.path.title} · {self.course.title}'
