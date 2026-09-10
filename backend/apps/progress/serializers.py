from rest_framework import serializers

from apps.courses.models import Course, Lesson

from .models import Assignment, Certificate, Enrollment, LessonProgress


class EnrollmentCourseSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_accent = serializers.CharField(source='category.accent', read_only=True, default=None)
    thumbnail = serializers.SerializerMethodField()
    module_count = serializers.IntegerField(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'summary', 'level', 'primary_format',
            'duration_minutes', 'is_mandatory', 'thumbnail', 'category_name',
            'category_accent', 'module_count', 'lesson_count',
        ]

    def get_thumbnail(self, obj) -> str | None:
        if not obj.thumbnail:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = [
            'lesson', 'completed', 'resume_position_seconds',
            'time_spent_seconds', 'completed_at',
        ]


class EnrollmentSerializer(serializers.ModelSerializer):
    course = EnrollmentCourseSerializer(read_only=True)
    lesson_progress = LessonProgressSerializer(many=True, read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'status', 'progress', 'enrolled_at', 'started_at',
            'completed_at', 'last_lesson', 'course', 'lesson_progress',
        ]


class EnrollCreateSerializer(serializers.Serializer):

    course = serializers.SlugRelatedField(
        slug_field='slug', queryset=Course.objects.filter(is_published=True)
    )


class LessonProgressWriteSerializer(serializers.Serializer):

    resume_position_seconds = serializers.IntegerField(required=False, min_value=0)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0, default=0)
    completed = serializers.BooleanField(required=False, default=False)


class CertificateSerializer(serializers.ModelSerializer):
    course_slug = serializers.CharField(source='course.slug', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Certificate
        fields = [
            'id', 'code', 'holder_name', 'course_title', 'course_slug',
            'issued_at', 'is_valid',
        ]


class VerifySerializer(serializers.Serializer):

    valid = serializers.BooleanField()
    code = serializers.CharField()
    holder_name = serializers.CharField()
    course_title = serializers.CharField()
    issued_at = serializers.DateTimeField()


class AssignmentSerializer(serializers.ModelSerializer):

    course = EnrollmentCourseSerializer(read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department = serializers.CharField(source='user.department.name', read_only=True, default=None)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True, default=None)
    status = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'user', 'user_name', 'user_email', 'department', 'course',
            'assigned_by', 'assigned_by_name', 'due_date', 'note', 'created_at',
            'status', 'progress',
        ]

    def _enrollment(self, obj):
        cache = self.context.get('enrollment_map', {})
        return cache.get((obj.user_id, obj.course_id))

    def get_status(self, obj) -> str:
        e = self._enrollment(obj)
        return e.status if e else 'not_started'

    def get_progress(self, obj) -> int:
        e = self._enrollment(obj)
        return e.progress if e else 0


class AssignmentCreateSerializer(serializers.ModelSerializer):
    course = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.filter(is_published=True)
    )

    class Meta:
        model = Assignment
        fields = ['id', 'user', 'course', 'due_date', 'note']
        validators = []
