from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from .models import Certificate, Enrollment


def platform_analytics() -> dict:
    from apps.accounts.models import Role, User
    from apps.assessments.models import QuizAttempt
    from apps.courses.models import Category, Course

    users = User.objects.all()
    by_role = {r.value: 0 for r in Role}
    for row in users.values('role').annotate(n=Count('id')):
        by_role[row['role']] = row['n']
    total_users = users.count()
    active_users = users.filter(is_active=True).count()

    courses = Course.objects.all()
    total_courses = courses.count()
    published = courses.filter(is_published=True).count()
    mandatory = courses.filter(is_mandatory=True, is_published=True).count()

    enrollments = Enrollment.objects.all()
    total_enroll = enrollments.count()
    completed = enrollments.filter(status='completed').count()
    in_progress = enrollments.filter(status='in_progress').count()
    not_started = enrollments.filter(status='not_started').count()
    completion_rate = round(100 * completed / total_enroll) if total_enroll else 0

    avg_score = QuizAttempt.objects.aggregate(a=Avg('score'))['a'] or 0

    top = (
        Course.objects.annotate(
            enroll_count=Count('enrollments', distinct=True),
            completed_count=Count(
                'enrollments', filter=Q(enrollments__status='completed'), distinct=True
            ),
        )
        .filter(enroll_count__gt=0)
        .order_by('-enroll_count')[:6]
    )
    top_courses = [
        {
            'title': c.title,
            'slug': c.slug,
            'enrollments': c.enroll_count,
            'completed': c.completed_count,
            'completion_rate': round(100 * c.completed_count / c.enroll_count) if c.enroll_count else 0,
        }
        for c in top
    ]

    cats = (
        Category.objects.annotate(
            course_count=Count('courses', filter=Q(courses__is_published=True), distinct=True),
            enrollment_count=Count('courses__enrollments', distinct=True),
        )
        .order_by('-course_count', 'name')
    )
    category_breakdown = [
        {
            'name': c.name,
            'accent': c.accent,
            'courses': c.course_count,
            'enrollments': c.enrollment_count,
        }
        for c in cats
    ]

    return {
        'users': {
            'total': total_users,
            'active': active_users,
            'inactive': total_users - active_users,
            'by_role': by_role,
        },
        'courses': {
            'total': total_courses,
            'published': published,
            'draft': total_courses - published,
            'mandatory': mandatory,
        },
        'enrollments': {
            'total': total_enroll,
            'completed': completed,
            'in_progress': in_progress,
            'not_started': not_started,
            'completion_rate': completion_rate,
        },
        'certificates': Certificate.objects.count(),
        'avg_quiz_score': round(avg_score),
        'top_courses': top_courses,
        'category_breakdown': category_breakdown,
    }


class AdminAnalyticsView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response(platform_analytics())
