from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_audit
from apps.accounts.models import Role, User
from apps.accounts.permissions import IsManagerOrAdmin
from apps.courses.models import Course, Lesson
from apps.courses.visibility import visible_courses_q

from .media import range_file_response, resolve_media_user
from .models import Assignment, Certificate, Enrollment, LessonProgress
from .reports import build_report, report_export
from .serializers import (
    AssignmentCreateSerializer,
    AssignmentSerializer,
    CertificateSerializer,
    EnrollCreateSerializer,
    EnrollmentSerializer,
    LessonProgressWriteSerializer,
    VerifySerializer,
)
from .services import assignments_in_scope, recompute_enrollment


def _is_staff(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, 'is_admin_role', False) or getattr(user, 'is_manager_role', False))
    )


class EnrollmentListCreateView(ListCreateAPIView):

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            Enrollment.objects.filter(user=self.request.user)
            .select_related('course', 'course__category', 'last_lesson')
            .prefetch_related('lesson_progress')
        )

    def get_serializer_class(self):
        return EnrollCreateSerializer if self.request.method == 'POST' else EnrollmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = EnrollCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.validated_data['course']
        if not Course.objects.filter(visible_courses_q(request.user), pk=course.pk).exists():
            return Response(
                {'detail': 'This course is not available.', 'code': 'not_available'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Internal-only courses can't be enrolled from off-net (spec 2.6.2).
        if course.internal_only and not getattr(request, 'on_net', False):
            return Response(
                {'detail': 'This course is available only on the internal Icosnet network.',
                 'code': 'internal_off_net'},
                status=status.HTTP_403_FORBIDDEN,
            )
        enrollment, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        recompute_enrollment(enrollment)
        out = EnrollmentSerializer(enrollment, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class EnrollmentDetailView(RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = EnrollmentSerializer
    lookup_field = 'course__slug'
    lookup_url_kwarg = 'slug'

    def get_queryset(self):
        return (
            Enrollment.objects.filter(user=self.request.user)
            .select_related('course', 'course__category', 'last_lesson')
            .prefetch_related('lesson_progress')
        )


class LessonProgressView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        lesson = get_object_or_404(Lesson.objects.select_related('module__course'), pk=pk)
        course = lesson.module.course
        enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
        if not enrollment:
            return Response(
                {'detail': 'Enroll in the course first.', 'code': 'not_enrolled'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = LessonProgressWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lp, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        if 'resume_position_seconds' in data:
            lp.resume_position_seconds = data['resume_position_seconds']
        lp.time_spent_seconds = (lp.time_spent_seconds or 0) + data.get('time_spent_seconds', 0)
        if data.get('completed') and not lp.completed:
            lp.completed = True
            lp.completed_at = timezone.now()
        lp.save()

        enrollment.last_lesson = lesson
        enrollment.save(update_fields=['last_lesson'])
        recompute_enrollment(enrollment)

        return Response(EnrollmentSerializer(enrollment, context={'request': request}).data)


@method_decorator(xframe_options_exempt, name='dispatch')
class LessonMediaView(APIView):
    # The learner viewer embeds PDFs in an <iframe> whose src is this endpoint,
    # served from a different origin than the SPA (frontend :3000 -> API :8000).
    # The global XFrameOptionsMiddleware would send X-Frame-Options: DENY and the
    # browser would refuse to render the frame (SAMEORIGIN is not enough across
    # ports), leaving a blank viewer. Opt this endpoint out; the file stays
    # access-controlled by the auth/enrolment checks in get().

    permission_classes = [AllowAny]

    def get(self, request, pk):
        lesson = get_object_or_404(Lesson.objects.select_related('module__course'), pk=pk)
        user = resolve_media_user(request)
        if not user:
            return Response(
                {'detail': 'Authentication required.', 'code': 'not_authenticated'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        course = lesson.module.course
        off_net = not getattr(request, 'on_net', False)
        # Internal-only course content is confidential — never served off-net, for
        # anyone (spec 2.6.2).
        if course.internal_only and off_net:
            return Response(
                {'detail': 'This content is available only on the internal Icosnet network.',
                 'code': 'internal_off_net'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Explicit downloads (save-to-disk) are blocked off-net; inline viewing is fine.
        download = str(request.GET.get('download', '')).lower() in ('1', 'true', 'yes')
        if download and off_net:
            return Response(
                {'detail': 'Downloads are available only on the internal Icosnet network.',
                 'code': 'download_off_net'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not _is_staff(user):
            if not course.is_published:
                return Response(
                    {'detail': 'This lesson is not available.', 'code': 'not_available'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            enrolled = Enrollment.objects.filter(user=user, course=course).exists()
            if not (lesson.is_preview or enrolled):
                return Response(
                    {'detail': 'Enroll to access this lesson.', 'code': 'not_enrolled'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if not lesson.file:
            return Response(
                {'detail': 'This lesson has no media file.', 'code': 'no_media'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return range_file_response(request, lesson.file, as_attachment=download)


class CertificateListView(ListAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = CertificateSerializer
    pagination_class = None

    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user).select_related('course')


class CertificateDownloadView(APIView):

    permission_classes = [AllowAny]

    def get(self, request, code):
        user = resolve_media_user(request)
        if not user:
            return Response(
                {'detail': 'Authentication required.', 'code': 'not_authenticated'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        cert = get_object_or_404(Certificate, code=code)
        if cert.user_id != user.id and not _is_staff(user):
            return Response(
                {'detail': 'Not your certificate.', 'code': 'forbidden'},
                status=status.HTTP_403_FORBIDDEN,
            )
        from .certificates import build_certificate_pdf

        pdf = build_certificate_pdf(cert)
        resp = HttpResponse(pdf, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="certificate-{cert.code}.pdf"'
        return resp


class VerifyView(APIView):

    permission_classes = [AllowAny]
    throttle_scope = 'verify'

    def get(self, request, code):
        cert = Certificate.objects.filter(code=code).first()
        if not cert:
            return Response(
                {'valid': False, 'code': code, 'detail': 'No certificate with this code.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        payload = VerifySerializer(
            {
                'valid': cert.is_valid,
                'code': cert.code,
                'holder_name': cert.holder_name,
                'course_title': cert.course_title,
                'issued_at': cert.issued_at,
            }
        )
        return Response(payload.data)


class AssignmentViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]
    pagination_class = None
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsManagerOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return AssignmentCreateSerializer
        return AssignmentSerializer

    def get_queryset(self):
        return assignments_in_scope(self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.action == 'list':
            pairs = list(self.get_queryset().values_list('user_id', 'course_id'))
            if pairs:
                user_ids = {u for u, _ in pairs}
                course_ids = {c for _, c in pairs}
                enrolls = Enrollment.objects.filter(user_id__in=user_ids, course_id__in=course_ids)
                ctx['enrollment_map'] = {(e.user_id, e.course_id): e for e in enrolls}
        return ctx

    def _can_assign_to(self, actor, target) -> bool:
        if getattr(actor, 'is_admin_role', False):
            return True
        if actor.role == Role.MANAGER:
            if getattr(target, 'is_admin_role', False):
                return False
            if actor.department_id and target.department_id == actor.department_id:
                return True
            return target.manager_id == actor.id
        return False

    def create(self, request, *args, **kwargs):
        serializer = AssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not self._can_assign_to(request.user, data['user']):
            return Response(
                {'detail': 'You can only assign courses within your team.', 'code': 'out_of_scope'},
                status=status.HTTP_403_FORBIDDEN,
            )
        assignment, created = Assignment.objects.update_or_create(
            user=data['user'], course=data['course'],
            defaults={
                'assigned_by': request.user,
                'due_date': data.get('due_date'),
                'note': data.get('note', ''),
            },
        )
        enrollment, _ = Enrollment.objects.get_or_create(user=data['user'], course=data['course'])
        record_audit(
            request.user, 'assignment.create', target=assignment,
            target_repr=f'{data["user"].email} → {data["course"].title}',
        )
        out = AssignmentSerializer(assignment, context={
            'request': request,
            'enrollment_map': {(assignment.user_id, assignment.course_id): enrollment},
        })
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def perform_destroy(self, instance):
        record_audit(
            self.request.user, 'assignment.delete', target=instance,
            target_repr=f'{instance.user.email} → {instance.course.title}',
        )
        instance.delete()

    @action(detail=False, methods=['get'], url_path='assignable-users',
            permission_classes=[IsManagerOrAdmin])
    def assignable_users(self, request):
        user = request.user
        qs = User.objects.filter(is_active=True)
        if not getattr(user, 'is_admin_role', False):
            qs = qs.exclude(role=Role.ADMIN).exclude(is_superuser=True)
            if user.department_id:
                qs = qs.filter(department_id=user.department_id)
            else:
                qs = qs.filter(manager_id=user.id)
        rows = [
            {'id': u.id, 'name': u.full_name, 'email': u.email}
            for u in qs.order_by('first_name', 'last_name')
        ]
        return Response(rows)


class ReportView(APIView):

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        rows = build_report(request.user, request.query_params)
        return Response({'count': len(rows), 'rows': rows})


class ReportExportView(APIView):

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        fmt = request.query_params.get('fmt', 'csv').lower()
        rows = build_report(request.user, request.query_params)
        content, content_type, filename = report_export(rows, fmt)
        record_audit(request.user, 'report.export', target_repr=f'{len(rows)} rows ({fmt})')
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
