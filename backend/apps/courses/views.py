from django.db.models import Count, Prefetch
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_audit

from .filters import CourseFilter
from .models import Category, Course, LearningPath, Lesson, Module, Resource
from .permissions import IsCourseAuthorOrAdmin, can_author, can_manage_course
from .serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseWriteSerializer,
    LearningPathSerializer,
    LessonWriteSerializer,
    ModuleWriteSerializer,
    ResourceWriteSerializer,
)
from .visibility import visible_courses_q


def _visible_courses(user, *, annotate=False):
    qs = Course.objects.select_related('category', 'author')
    if annotate:
        qs = qs.annotate(
            num_modules=Count('modules', distinct=True),
            num_lessons=Count('modules__lessons', distinct=True),
        )
    return qs.filter(visible_courses_q(user))


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    lookup_field = 'slug'

    def get_queryset(self):
        return Category.objects.annotate(
            course_count=Count(
                'courses',
                filter=visible_courses_q(self.request.user, 'courses__'),
                distinct=True,
            )
        )


class CourseViewSet(viewsets.ModelViewSet):

    lookup_field = 'slug'
    filterset_class = CourseFilter
    search_fields = ['title', 'summary', 'description', 'category__name']
    ordering_fields = ['created_at', 'title', 'duration_minutes', 'level']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsCourseAuthorOrAdmin()]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CourseWriteSerializer
        return CourseListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if self.action == 'retrieve' and user.is_authenticated:
            from apps.progress.models import Enrollment

            slug = self.kwargs.get(self.lookup_field)
            ctx['enrolled'] = Enrollment.objects.filter(user=user, course__slug=slug).exists()
            if getattr(user, 'is_admin_role', False):
                ctx['can_view_content'] = True
            elif getattr(user, 'is_manager_role', False):
                ctx['can_view_content'] = Course.objects.filter(
                    slug=slug, author_id=user.id
                ).exists()
            # Off-net: an internal-only course is confidential (spec 2.6.2) — mask its
            # lesson content for everyone regardless of enrolment/role, so file URLs,
            # external links and rich text never leave over an untrusted network.
            if not getattr(self.request, 'on_net', False) and Course.objects.filter(
                slug=slug, internal_only=True
            ).exists():
                ctx['enrolled'] = False
                ctx['can_view_content'] = False
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs = (
            Course.objects.select_related('category', 'author')
            .annotate(
                num_modules=Count('modules', distinct=True),
                num_lessons=Count('modules__lessons', distinct=True),
            )
            .filter(visible_courses_q(user))
        )
        if str(self.request.query_params.get('mine', '')).lower() in ('1', 'true', 'yes'):
            if user and user.is_authenticated:
                qs = qs.filter(author_id=user.id)
        if self.action == 'retrieve':
            qs = qs.prefetch_related(
                Prefetch('modules', queryset=Module.objects.order_by('order', 'id')),
                Prefetch('modules__lessons', queryset=Lesson.objects.order_by('order', 'id')),
                'resources',
                Prefetch('prerequisites', queryset=_visible_courses(self.request.user)),
            )
        return qs

    def perform_create(self, serializer):
        course = serializer.save()
        record_audit(
            self.request.user, 'course.create', target=course, target_repr=course.title
        )

    def perform_destroy(self, instance):
        title = instance.title
        record_audit(
            self.request.user, 'course.delete', target=instance, target_repr=title
        )
        instance.delete()


class _OwnedAuthoringMixin:

    permission_classes = [IsCourseAuthorOrAdmin]
    pagination_class = None

    def _owns_all(self) -> bool:
        return bool(getattr(self.request.user, 'is_admin_role', False))

    def _target_course(self, validated_data):
        return None

    def _guard(self, course):
        if course is not None and not can_manage_course(self.request.user, course):
            raise PermissionDenied('You can only edit content in courses you own.')

    def perform_create(self, serializer):
        self._guard(self._target_course(serializer.validated_data))
        serializer.save()

    def perform_update(self, serializer):
        self._guard(self._target_course(serializer.validated_data))
        serializer.save()


class ModuleViewSet(_OwnedAuthoringMixin, viewsets.ModelViewSet):

    serializer_class = ModuleWriteSerializer
    filterset_fields = ['course']
    ordering = ['order', 'id']

    def get_queryset(self):
        qs = Module.objects.select_related('course')
        if not self._owns_all():
            qs = qs.filter(course__author_id=self.request.user.id)
        return qs

    def _target_course(self, validated_data):
        return validated_data.get('course')


class LessonViewSet(_OwnedAuthoringMixin, viewsets.ModelViewSet):

    serializer_class = LessonWriteSerializer
    filterset_fields = ['module']
    ordering = ['order', 'id']

    def get_queryset(self):
        qs = Lesson.objects.select_related('module__course')
        if not self._owns_all():
            qs = qs.filter(module__course__author_id=self.request.user.id)
        return qs

    def _target_course(self, validated_data):
        module = validated_data.get('module')
        return module.course if module is not None else None


class ResourceViewSet(_OwnedAuthoringMixin, viewsets.ModelViewSet):

    serializer_class = ResourceWriteSerializer
    filterset_fields = ['course']

    def get_queryset(self):
        qs = Resource.objects.select_related('course')
        if not self._owns_all():
            qs = qs.filter(course__author_id=self.request.user.id)
        return qs

    def _target_course(self, validated_data):
        return validated_data.get('course')


class LearningPathViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = LearningPathSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = LearningPath.objects.prefetch_related(
            Prefetch('courses', queryset=_visible_courses(self.request.user, annotate=True))
        )
        if not can_author(self.request.user):
            qs = qs.filter(is_published=True)
        return qs


class LandingPreviewView(APIView):
    """Anonymous glimpse of the library for the public landing page.

    Deliberately minimal exposure: a handful of published course titles with
    their category and lesson formats, category names, and one path title.
    No slugs, descriptions, authors or counts.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # a stale Bearer token must not 401 the public page

    def get(self, request):
        categories = list(
            Category.objects.filter(courses__is_published=True)
            .distinct()
            .order_by('order', 'name')
            .values_list('name', flat=True)[:4]
        )

        courses = []
        for course in (
            Course.objects.filter(visible_courses_q(None))  # published, minus department-scoped
            .select_related('category')
            .order_by('-created_at')[:3]
        ):
            formats = list(
                Lesson.objects.filter(module__course=course)
                .order_by()  # clear default ordering so distinct() stays distinct
                .values_list('content_type', flat=True)
                .distinct()[:3]
            )
            courses.append(
                {
                    'title': course.title,
                    'category': course.category.name if course.category else None,
                    'accent': course.category.accent if course.category else 'primary',
                    'formats': formats,
                }
            )

        path_title = (
            LearningPath.objects.filter(is_published=True)
            .values_list('title', flat=True)
            .first()
        )

        return Response({'categories': categories, 'courses': courses, 'path': path_title})
