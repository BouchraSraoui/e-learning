from django.db.models import Count, F, Max
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.courses.models import Course
from apps.courses.serializers import CourseListSerializer
from apps.courses.visibility import audience_scope_q

from .models import Assignment, Certificate, Enrollment, EnrollmentStatus
from .serializers import CertificateSerializer, EnrollmentCourseSerializer, EnrollmentSerializer
from .services import assignments_in_scope

CONTINUE_LIMIT = 4
MANDATORY_LIMIT = 6
ASSIGNED_LIMIT = 6
RECOMMEND_LIMIT = 4
CERTS_LIMIT = 3
TEAM_LIMIT = 6


class MandatoryItemSerializer(serializers.Serializer):

    course = EnrollmentCourseSerializer()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    enrolled = serializers.BooleanField()


class AssignedItemSerializer(serializers.Serializer):

    course = EnrollmentCourseSerializer()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    enrolled = serializers.BooleanField()
    due_date = serializers.DateField(allow_null=True)
    assigned_by = serializers.CharField(allow_null=True)


class TeamAssignmentSerializer(serializers.Serializer):

    id = serializers.CharField()
    user_name = serializers.CharField()
    user_email = serializers.CharField()
    course = EnrollmentCourseSerializer()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    due_date = serializers.DateField(allow_null=True)
    overdue = serializers.BooleanField()


class TeamCountsSerializer(serializers.Serializer):

    total = serializers.IntegerField()
    not_started = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    overdue = serializers.IntegerField()


class TeamOverviewSerializer(serializers.Serializer):

    assignments = TeamAssignmentSerializer(many=True)
    counts = TeamCountsSerializer()


class DashboardView(APIView):

    permission_classes = [IsAuthenticated]

    STAT_FIELDS = (
        'courses_in_progress', 'courses_completed', 'certificates_count',
        'learning_minutes', 'avg_quiz_score', 'streak_days', 'points',
    )

    def get(self, request):
        user = request.user
        ctx = {'request': request}
        user.refresh_from_db(fields=self.STAT_FIELDS)

        enrolled = {e.course_id: e for e in Enrollment.objects.filter(user=user)}

        continue_qs = (
            Enrollment.objects.filter(user=user, status=EnrollmentStatus.IN_PROGRESS)
            .select_related('course', 'course__category', 'last_lesson')
            .prefetch_related('lesson_progress')
            .annotate(last_activity=Max('lesson_progress__last_viewed_at'))
            .order_by(F('last_activity').desc(nulls_last=True), '-enrolled_at')[:CONTINUE_LIMIT]
        )

        mandatory_courses = (
            Course.objects.filter(audience_scope_q(user), is_published=True, is_mandatory=True)
            .select_related('category')
            .order_by('title')
        )
        mandatory = []
        mandatory_remaining = 0
        for course in mandatory_courses:
            enrollment = enrolled.get(course.id)
            status = enrollment.status if enrollment else EnrollmentStatus.NOT_STARTED
            if status == EnrollmentStatus.COMPLETED:
                continue
            mandatory_remaining += 1
            mandatory.append(
                {
                    'course': course,
                    'status': status,
                    'progress': enrollment.progress if enrollment else 0,
                    'enrolled': bool(enrollment),
                }
            )
        mandatory_ids = {item['course'].id for item in mandatory}
        mandatory = mandatory[:MANDATORY_LIMIT]

        # Courses a manager assigned (or that were auto-assigned by scope) —
        # otherwise a non-mandatory assigned course is invisible: it isn't
        # in-progress, is excluded from recommendations (already enrolled), and
        # isn't mandatory. Skip completed ones and any already shown as mandatory.
        assignment_qs = (
            Assignment.objects.filter(user=user)
            .select_related('course', 'course__category', 'assigned_by')
            .order_by(F('due_date').asc(nulls_last=True), '-created_at')
        )
        assigned = []
        for assignment in assignment_qs:
            course = assignment.course
            if not course.is_published or course.id in mandatory_ids:
                continue
            enrollment = enrolled.get(course.id)
            status = enrollment.status if enrollment else EnrollmentStatus.NOT_STARTED
            if status == EnrollmentStatus.COMPLETED:
                continue
            assigned_by = assignment.assigned_by
            assigned.append(
                {
                    'course': course,
                    'status': status,
                    'progress': enrollment.progress if enrollment else 0,
                    'enrolled': bool(enrollment),
                    'due_date': assignment.due_date,
                    'assigned_by': (
                        assigned_by.get_full_name() or assigned_by.email
                        if assigned_by else None
                    ),
                }
            )
            if len(assigned) >= ASSIGNED_LIMIT:
                break

        team = self._team_overview(user)

        recommendations = (
            Course.objects.filter(audience_scope_q(user), is_published=True, is_mandatory=False)
            .exclude(id__in=enrolled.keys())
            .select_related('category', 'author')
            .annotate(
                num_modules=Count('modules', distinct=True),
                num_lessons=Count('modules__lessons', distinct=True),
            )
            .order_by('-created_at')[:RECOMMEND_LIMIT]
        )

        certificates = Certificate.objects.filter(user=user).select_related('course')[:CERTS_LIMIT]

        stats = {
            'courses_in_progress': user.courses_in_progress,
            'courses_completed': user.courses_completed,
            'certificates': user.certificates_count,
            'learning_hours': round(user.learning_minutes / 60),
            'avg_quiz_score': user.avg_quiz_score,
            'streak_days': user.streak_days,
            'points': user.points,
            'mandatory_remaining': mandatory_remaining,
        }

        return Response(
            {
                'stats': stats,
                'continue_learning': EnrollmentSerializer(continue_qs, many=True, context=ctx).data,
                'mandatory': MandatoryItemSerializer(mandatory, many=True, context=ctx).data,
                'assigned': AssignedItemSerializer(assigned, many=True, context=ctx).data,
                'team': (
                    TeamOverviewSerializer(team, context=ctx).data if team is not None else None
                ),
                'recommendations': CourseListSerializer(recommendations, many=True, context=ctx).data,
                'recent_certificates': CertificateSerializer(certificates, many=True, context=ctx).data,
            }
        )

    def _team_overview(self, user):
        """What a manager/admin assigned to other people, for their dashboard.

        Without this a manager who assigns a course sees it nowhere on their own
        home — the learner `assigned` section only ever covers courses assigned
        *to them*. Learners get None (no team section at all).
        """
        if user.role not in (Role.MANAGER, Role.ADMIN) and not user.is_admin_role:
            return None

        rows = list(
            assignments_in_scope(user)
            .exclude(user_id=user.id)
            .order_by(F('due_date').asc(nulls_last=True), '-created_at')
        )

        enrollment_map = {}
        if rows:
            enrollment_map = {
                (e.user_id, e.course_id): e
                for e in Enrollment.objects.filter(
                    user_id__in={a.user_id for a in rows},
                    course_id__in={a.course_id for a in rows},
                )
            }

        today = timezone.localdate()
        counts = {'total': 0, 'not_started': 0, 'in_progress': 0, 'completed': 0, 'overdue': 0}
        assignments = []
        for assignment in rows:
            enrollment = enrollment_map.get((assignment.user_id, assignment.course_id))
            status = enrollment.status if enrollment else EnrollmentStatus.NOT_STARTED
            overdue = bool(
                assignment.due_date
                and assignment.due_date < today
                and status != EnrollmentStatus.COMPLETED
            )
            counts['total'] += 1
            counts[status] += 1
            if overdue:
                counts['overdue'] += 1
            if len(assignments) < TEAM_LIMIT:
                target = assignment.user
                assignments.append(
                    {
                        'id': str(assignment.id),
                        'user_name': target.full_name or target.email,
                        'user_email': target.email,
                        'course': assignment.course,
                        'status': status,
                        'progress': enrollment.progress if enrollment else 0,
                        'due_date': assignment.due_date,
                        'overdue': overdue,
                    }
                )

        return {'assignments': assignments, 'counts': counts}
