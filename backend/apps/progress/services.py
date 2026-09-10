from django.db.models import Max, Q, Sum
from django.utils import timezone

from apps.accounts.models import Role

from .models import (
    Assignment,
    Certificate,
    Enrollment,
    EnrollmentStatus,
    LessonProgress,
    _new_certificate_code,
)


def assignments_in_scope(user):
    """Assignments `user` is allowed to see.

    The single scoping rule shared by the assignments API and the manager
    dashboard, so the two can never drift apart on who may see whose row.
    A manager without a department only sees what they assigned themselves.
    """
    qs = Assignment.objects.select_related(
        'user', 'course', 'course__category', 'assigned_by', 'user__department'
    )
    if getattr(user, 'is_admin_role', False):
        return qs
    if user.role == Role.MANAGER:
        if user.department_id:
            return qs.filter(user__department_id=user.department_id)
        return qs.filter(assigned_by=user)
    return qs.filter(user=user)


def _course_quizzes(course):
    from apps.assessments.models import Quiz

    return Quiz.objects.filter(is_published=True).filter(
        Q(course=course) | Q(module__course=course)
    )


def recompute_enrollment(enrollment: Enrollment) -> Enrollment:
    from apps.assessments.models import QuizAttempt
    from apps.courses.models import Lesson

    course = enrollment.course
    total_lessons = Lesson.objects.filter(module__course=course).count()
    done_lessons = enrollment.lesson_progress.filter(
        completed=True, lesson__module__course=course
    ).count()

    quizzes = _course_quizzes(course)
    total_quizzes = quizzes.count()
    passed_quizzes = (
        QuizAttempt.objects.filter(user=enrollment.user, passed=True, quiz__in=quizzes)
        .values('quiz')
        .distinct()
        .count()
    )

    total_steps = total_lessons + total_quizzes
    done_steps = done_lessons + passed_quizzes
    complete = total_steps > 0 and done_steps >= total_steps
    if not total_steps:
        enrollment.progress = 0
    elif complete:
        enrollment.progress = 100
    else:
        enrollment.progress = min(99, round(done_steps / total_steps * 100))

    if done_steps == 0:
        enrollment.status = EnrollmentStatus.NOT_STARTED
    elif complete:
        enrollment.status = EnrollmentStatus.COMPLETED
    else:
        enrollment.status = EnrollmentStatus.IN_PROGRESS

    if enrollment.status == EnrollmentStatus.IN_PROGRESS and not enrollment.started_at:
        enrollment.started_at = timezone.now()

    newly_completed = False
    if enrollment.status == EnrollmentStatus.COMPLETED and not enrollment.completed_at:
        enrollment.completed_at = timezone.now()
        newly_completed = True

    enrollment.save()

    if newly_completed and getattr(course, 'issues_certificate', True):
        issue_certificate(enrollment.user, course)
    recompute_user_stats(enrollment.user)
    return enrollment


def issue_certificate(user, course) -> Certificate:
    cert, created = Certificate.objects.get_or_create(
        user=user,
        course=course,
        defaults={
            'code': _new_certificate_code(),
            'holder_name': user.full_name or user.email,
            'course_title': course.title,
        },
    )
    if created:
        cert.signature = cert.compute_signature()
        cert.save(update_fields=['signature'])
        from .tasks import send_certificate_notification

        send_certificate_notification.delay(cert.id)
    return cert


def recompute_user_stats(user) -> None:
    from apps.assessments.models import QuizAttempt

    enrollments = Enrollment.objects.filter(user=user)
    completed_courses = enrollments.filter(status=EnrollmentStatus.COMPLETED).count()
    in_progress = enrollments.filter(status=EnrollmentStatus.IN_PROGRESS).count()

    completed_lessons = LessonProgress.objects.filter(enrollment__user=user, completed=True)
    minutes = completed_lessons.aggregate(m=Sum('lesson__duration_minutes'))['m'] or 0

    best_per_quiz = (
        QuizAttempt.objects.filter(user=user)
        .values('quiz')
        .annotate(best=Max('score'))
        .values_list('best', flat=True)
    )
    best_scores = list(best_per_quiz)
    avg_score = round(sum(best_scores) / len(best_scores)) if best_scores else 0

    user.courses_in_progress = in_progress
    user.courses_completed = completed_courses
    user.certificates_count = Certificate.objects.filter(user=user).count()
    user.learning_minutes = minutes
    user.avg_quiz_score = avg_score
    user.points = completed_lessons.count() * 10 + completed_courses * 50
    user.save(
        update_fields=[
            'courses_in_progress',
            'courses_completed',
            'certificates_count',
            'learning_minutes',
            'avg_quiz_score',
            'points',
        ]
    )
