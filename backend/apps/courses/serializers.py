import os

from rest_framework import serializers

from .models import (
    Category,
    Course,
    ContentType,
    LearningPath,
    Lesson,
    Module,
    Resource,
)
from .validators import sanitize_html, validate_lesson_file_for_type


class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'accent', 'description', 'order', 'course_count']
        read_only_fields = ['id', 'slug']


class ResourceSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = ['id', 'title', 'file', 'external_url']

    def get_file(self, obj) -> str | None:
        if not obj.file:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class LessonSerializer(serializers.ModelSerializer):

    file = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    external_url = serializers.SerializerMethodField()
    rich_text = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'content_type', 'duration_minutes', 'order',
            'is_preview', 'file', 'file_name', 'external_url', 'rich_text',
        ]

    def _can_view_content(self, obj) -> bool:
        enrolled = bool(self.context.get('enrolled'))
        privileged = bool(self.context.get('can_view_content'))
        return obj.is_preview or privileged or enrolled

    def get_file(self, obj) -> str | None:
        if not obj.file or not self._can_view_content(obj):
            return None
        request = self.context.get('request')
        path = f'/api/lessons/{obj.id}/media/'
        return request.build_absolute_uri(path) if request else path

    def get_file_name(self, obj) -> str | None:
        if not obj.file or not self._can_view_content(obj):
            return None
        return os.path.basename(obj.file.name)

    def get_external_url(self, obj) -> str:
        return obj.external_url if self._can_view_content(obj) else ''

    def get_rich_text(self, obj) -> str:
        return obj.rich_text if self._can_view_content(obj) else ''


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'summary', 'order', 'lesson_count', 'lessons']

    def get_lesson_count(self, obj) -> int:
        return len(obj.lessons.all())


class CourseListSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_accent = serializers.CharField(source='category.accent', read_only=True, default=None)
    author_name = serializers.CharField(source='author.full_name', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    thumbnail = serializers.SerializerMethodField()
    module_count = serializers.IntegerField(source='num_modules', read_only=True)
    lesson_count = serializers.IntegerField(source='num_lessons', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'summary', 'category', 'category_name',
            'category_accent', 'level', 'primary_format', 'duration_minutes',
            'is_mandatory', 'is_published', 'issues_certificate', 'internal_only',
            'audience', 'department', 'department_name', 'thumbnail',
            'author', 'author_name', 'module_count', 'lesson_count',
            'created_at', 'updated_at',
        ]

    def get_thumbnail(self, obj) -> str | None:
        if not obj.thumbnail:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url


class CoursePrerequisiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'title', 'slug', 'level', 'duration_minutes']


class CourseDetailSerializer(CourseListSerializer):

    modules = ModuleSerializer(many=True, read_only=True)
    resources = ResourceSerializer(many=True, read_only=True)
    prerequisites = CoursePrerequisiteSerializer(many=True, read_only=True)
    quizzes = serializers.SerializerMethodField()

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            'description', 'objectives', 'modules', 'resources', 'prerequisites', 'quizzes',
        ]

    def get_quizzes(self, obj):
        from django.db.models import Q

        from apps.assessments.models import Quiz
        from apps.assessments.serializers import QuizRefSerializer

        qs = (
            Quiz.objects.filter(is_published=True)
            .filter(Q(course=obj) | Q(module__course=obj))
            .prefetch_related('questions')
        )
        return QuizRefSerializer(qs, many=True).data


class CourseWriteSerializer(serializers.ModelSerializer):

    prerequisites = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Course.objects.all(), required=False
    )

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'summary', 'description', 'objectives',
            'category', 'level', 'primary_format', 'duration_minutes',
            'is_mandatory', 'is_published', 'issues_certificate', 'internal_only',
            'audience', 'department', 'thumbnail', 'prerequisites',
        ]
        read_only_fields = ['id', 'slug']

    def validate_objectives(self, value):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError('Objectives must be a list of strings.')
        return [v.strip() for v in value if v.strip()]

    def validate_description(self, value):
        return sanitize_html(value)

    def validate_prerequisites(self, value):
        if self.instance and self.instance in value:
            raise serializers.ValidationError('A course cannot be its own prerequisite.')
        return value

    def validate(self, attrs):
        # A department-scoped course must name its department; other audiences
        # must not carry one (keeps auto-assignment targeting unambiguous).
        audience = attrs.get('audience', getattr(self.instance, 'audience', Course.Audience.OPEN))
        department = attrs.get('department', getattr(self.instance, 'department', None))
        if audience == Course.Audience.DEPARTMENT and department is None:
            raise serializers.ValidationError(
                {'department': 'A department is required for a department-scoped course.'}
            )
        if audience != Course.Audience.DEPARTMENT and department is not None:
            attrs['department'] = None
        return attrs

    def create(self, validated_data):
        validated_data.setdefault('author', self.context['request'].user)
        return super().create(validated_data)


class LessonWriteSerializer(serializers.ModelSerializer):

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'title', 'content_type', 'file', 'external_url',
            'rich_text', 'duration_minutes', 'order', 'is_preview',
        ]

    def validate_module(self, module):
        return module

    def validate(self, attrs):
        content_type = attrs.get('content_type') or getattr(self.instance, 'content_type', None)
        file = attrs.get('file')
        if content_type == ContentType.TEXT:
            if file:
                raise serializers.ValidationError(
                    {'file': 'Rich-text lessons must not carry a file.'}
                )
        elif file is not None:
            validate_lesson_file_for_type(file, content_type)
        return attrs


class ModuleWriteSerializer(serializers.ModelSerializer):

    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'summary', 'order', 'lesson_count']

    def get_lesson_count(self, obj) -> int:
        return obj.lessons.count()


class ResourceWriteSerializer(serializers.ModelSerializer):

    class Meta:
        model = Resource
        fields = ['id', 'course', 'title', 'file', 'external_url']

    def validate(self, attrs):
        file = attrs.get('file') or getattr(self.instance, 'file', None)
        url = attrs.get('external_url') or getattr(self.instance, 'external_url', None)
        if not file and not url:
            raise serializers.ValidationError('Provide a file or an external URL.')
        return attrs


class LearningPathSerializer(serializers.ModelSerializer):
    courses = CourseListSerializer(many=True, read_only=True)

    class Meta:
        model = LearningPath
        fields = ['id', 'title', 'slug', 'description', 'is_published', 'courses']
