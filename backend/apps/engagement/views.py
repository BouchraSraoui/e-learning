from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.courses.models import Course
from apps.courses.visibility import visible_courses_q

from .models import Badge, Comment, Feedback, Reaction, UserBadge
from .serializers import (
    BadgeSerializer,
    CommentCreateSerializer,
    CommentSerializer,
    FeedbackSerializer,
    FeedbackWriteSerializer,
    ReactionInputSerializer,
)


def _is_staff(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, 'is_admin_role', False) or getattr(user, 'is_manager_role', False))
    )



class CommentListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_throttles(self):
        self.throttle_scope = 'comment' if self.request.method == 'POST' else None
        return super().get_throttles()

    def get_serializer_class(self):
        return CommentCreateSerializer if self.request.method == 'POST' else CommentSerializer

    def get_queryset(self):
        course_slug = self.request.query_params.get('course')
        if not course_slug:
            return Comment.objects.none()
        qs = (
            Comment.objects.filter(course__slug=course_slug)
            .select_related('author', 'course')
            .prefetch_related('reactions')
        )
        lesson = self.request.query_params.get('lesson')
        if lesson:
            try:
                qs = qs.filter(lesson_id=int(lesson))
            except (TypeError, ValueError):
                raise ValidationError({'lesson': 'Must be an integer.'})
        if not _is_staff(self.request.user):
            qs = qs.filter(visible_courses_q(self.request.user, 'course__'), is_hidden=False)
        return qs

    def create(self, request, *args, **kwargs):
        ser = CommentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if not Course.objects.filter(
            visible_courses_q(request.user), pk=data['course'].pk
        ).exists():
            return Response(
                {'detail': 'This course is not available.', 'code': 'not_available'},
                status=status.HTTP_403_FORBIDDEN,
            )
        comment = Comment.objects.create(
            course=data['course'],
            lesson=data.get('lesson'),
            parent=data.get('parent'),
            author=request.user,
            body=data['body'],
        )
        out = CommentSerializer(comment, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if not (_is_staff(request.user) or comment.author_id == request.user.id):
            return Response({'detail': 'Not allowed.', 'code': 'forbidden'},
                            status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentModerateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not _is_staff(request.user):
            return Response({'detail': 'Moderator only.', 'code': 'forbidden'},
                            status=status.HTTP_403_FORBIDDEN)
        comment = get_object_or_404(Comment.objects.prefetch_related('reactions'), pk=pk)
        hidden = bool(request.data.get('hidden', True))
        comment.is_hidden = hidden
        comment.hidden_by = request.user if hidden else None
        comment.save(update_fields=['is_hidden', 'hidden_by'])
        return Response(CommentSerializer(comment, context={'request': request}).data)


class CommentReactView(APIView):

    permission_classes = [IsAuthenticated]
    throttle_scope = 'comment'

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        ser = ReactionInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        emoji = ser.validated_data['emoji']
        reaction, created = Reaction.objects.get_or_create(
            comment=comment, user=request.user, emoji=emoji
        )
        if not created:
            reaction.delete()
        fresh = Comment.objects.prefetch_related('reactions').get(pk=pk)
        return Response(CommentSerializer(fresh, context={'request': request}).data)



class CourseFeedbackView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        course = get_object_or_404(Course.objects.filter(visible_courses_q(request.user)), slug=slug)
        qs = Feedback.objects.filter(course=course).select_related('user', 'course')
        agg = qs.aggregate(avg=Avg('rating'), count=Count('id'))
        mine = qs.filter(user=request.user).first()
        reviews = qs.exclude(comment='')[:50]
        return Response({
            'average': round(agg['avg'], 1) if agg['avg'] else 0,
            'count': agg['count'],
            'mine': FeedbackSerializer(mine).data if mine else None,
            'results': FeedbackSerializer(reviews, many=True).data,
        })

    def post(self, request, slug):
        course = get_object_or_404(Course.objects.filter(visible_courses_q(request.user)), slug=slug)
        ser = FeedbackWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        fb, _ = Feedback.objects.update_or_create(
            user=request.user,
            course=course,
            defaults={
                'rating': ser.validated_data['rating'],
                'comment': ser.validated_data['comment'],
            },
        )
        return Response(FeedbackSerializer(fb).data, status=status.HTTP_200_OK)



class BadgeListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        earned = {
            ub.badge_id: ub.earned_at
            for ub in UserBadge.objects.filter(user=request.user)
        }
        ser = BadgeSerializer(Badge.objects.all(), many=True, context={'earned_map': earned})
        return Response(ser.data)


class LeaderboardView(APIView):

    permission_classes = [IsAuthenticated]

    def _row(self, request, u, rank):
        return {
            'rank': rank,
            'user_id': u.id,
            'name': u.full_name or u.email,
            'avatar': request.build_absolute_uri(u.avatar.url) if u.avatar else None,
            'department': u.department.name if u.department_id else None,
            'points': u.total_points,
            'badges': u.badge_count,
            'is_me': u.id == request.user.id,
        }

    def get(self, request):
        User = get_user_model()
        scope = request.query_params.get('scope', 'all')
        base = User.objects.filter(is_active=True)
        if scope == 'department':
            base = (
                base.filter(department_id=request.user.department_id)
                if request.user.department_id
                else base.none()
            )
        ranked = (
            base.select_related('department')
            .annotate(
                total_points=F('points') + F('badge_points'),
                badge_count=Count('user_badges', distinct=True),
            )
            .order_by('-total_points', 'id')
        )
        rows = [self._row(request, u, i + 1) for i, u in enumerate(ranked[:50])]

        me_total = request.user.points + request.user.badge_points
        my_rank = (
            base.annotate(tp=F('points') + F('badge_points'))
            .filter(Q(tp__gt=me_total) | Q(tp=me_total, id__lt=request.user.id))
            .count()
            + 1
        )
        me = {
            'rank': my_rank,
            'user_id': request.user.id,
            'name': request.user.full_name or request.user.email,
            'avatar': request.build_absolute_uri(request.user.avatar.url)
            if request.user.avatar else None,
            'department': request.user.department.name if request.user.department_id else None,
            'points': me_total,
            'badges': UserBadge.objects.filter(user=request.user).count(),
            'is_me': True,
        }
        return Response({'results': rows, 'me': me, 'scope': scope})
