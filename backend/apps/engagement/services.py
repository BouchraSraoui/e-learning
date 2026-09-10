from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from .badges import BADGE_CATALOG
from .signals import badge_earned


def sync_badge_catalog():
    from .models import Badge

    for spec in BADGE_CATALOG:
        Badge.objects.update_or_create(code=spec['code'], defaults=spec)


def badge_rules():
    from apps.assessments.models import QuizAttempt
    from apps.progress.models import Certificate, Enrollment, EnrollmentStatus

    from .models import Comment

    completed = lambda u: Enrollment.objects.filter(  # noqa: E731
        user=u, status=EnrollmentStatus.COMPLETED
    )
    return {
        'first-steps': lambda u: Enrollment.objects.filter(user=u).exists(),
        'getting-started': lambda u: u.enrollments.filter(
            lesson_progress__completed=True
        ).exists(),
        'course-complete': lambda u: completed(u).exists(),
        'certified': lambda u: Certificate.objects.filter(user=u).exists(),
        'quiz-ace': lambda u: QuizAttempt.objects.filter(user=u, score=100).exists(),
        'scholar': lambda u: completed(u).count() >= 5,
        'on-fire': lambda u: (u.streak_days or 0) >= 7,
        'contributor': lambda u: Comment.objects.filter(author=u).exists(),
    }


def touch_activity(user):
    today = timezone.localdate()
    last = user.last_activity_date
    if last == today:
        return
    if last == today - timedelta(days=1):
        user.streak_days = (user.streak_days or 0) + 1
    else:
        user.streak_days = 1
    user.last_activity_date = today
    user.save(update_fields=['streak_days', 'last_activity_date'])


def evaluate_badges(user):
    from .models import Badge, UserBadge

    rules = badge_rules()
    earned_codes = set(
        UserBadge.objects.filter(user=user).values_list('badge__code', flat=True)
    )
    newly = []
    for badge in Badge.objects.all():
        if badge.code in earned_codes:
            continue
        rule = rules.get(badge.code)
        if rule and rule(user):
            ub, created = UserBadge.objects.get_or_create(user=user, badge=badge)
            if created:
                newly.append(ub)

    if newly:
        pts = sum(ub.badge.points for ub in newly)
        type(user).objects.filter(pk=user.pk).update(badge_points=F('badge_points') + pts)
        user.refresh_from_db(fields=['badge_points'])
        for ub in newly:
            badge_earned.send(sender=UserBadge, user=user, badge=ub.badge)
    return newly
