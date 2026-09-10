from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.courses.permissions import IsCourseAuthorOrAdmin, can_manage_course

from .grading import grade
from .models import Quiz, QuizAttempt
from .serializers import (
    AttemptResultSerializer,
    AttemptSubmitSerializer,
    QuizSerializer,
    QuizWriteSerializer,
)


def _is_staff(user) -> bool:
    return bool(
        getattr(user, 'is_admin_role', False) or getattr(user, 'is_manager_role', False)
    )


def _is_enrolled(user, quiz) -> bool:
    from apps.progress.models import Enrollment

    course = quiz.course_ref
    return bool(course) and Enrollment.objects.filter(user=user, course=course).exists()


class QuizDetailView(RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = QuizSerializer

    def get_queryset(self):
        return Quiz.objects.filter(is_published=True).prefetch_related('questions__answers')

    def retrieve(self, request, *args, **kwargs):
        quiz = self.get_object()
        if not (_is_staff(request.user) or _is_enrolled(request.user, quiz)):
            return Response(
                {'detail': 'Enroll in the course to take this quiz.', 'code': 'not_enrolled'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(self.get_serializer(quiz).data)


class QuizAttemptListCreateView(ListCreateAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = AttemptResultSerializer
    pagination_class = None

    def _quiz(self):
        return get_object_or_404(
            Quiz.objects.filter(is_published=True).prefetch_related('questions__answers'),
            pk=self.kwargs['quiz_id'],
        )

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user, quiz_id=self.kwargs['quiz_id'])

    def create(self, request, *args, **kwargs):
        quiz = self._quiz()
        if not (_is_staff(request.user) or _is_enrolled(request.user, quiz)):
            return Response(
                {'detail': 'Enroll in the course to take this quiz.', 'code': 'not_enrolled'},
                status=status.HTTP_403_FORBIDDEN,
            )

        used = quiz.attempts.filter(user=request.user).count()
        if quiz.max_attempts and used >= quiz.max_attempts:
            return Response(
                {'detail': 'No attempts remaining.', 'code': 'no_attempts_left'},
                status=status.HTTP_403_FORBIDDEN,
            )

        submit = AttemptSubmitSerializer(data=request.data)
        submit.is_valid(raise_exception=True)
        responses = submit.validated_data['responses']

        score, review = grade(quiz, responses)
        passed = score >= quiz.pass_score
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            attempt_number=used + 1,
            score=score,
            passed=passed,
            responses=responses,
        )

        reveal = passed or (quiz.max_attempts and (used + 1) >= quiz.max_attempts)
        if not reveal:
            for item in review:
                item['correct_answer_ids'] = []

        course = quiz.course_ref
        if course:
            from apps.progress.models import Enrollment
            from apps.progress.services import recompute_enrollment

            enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
            if enrollment:
                recompute_enrollment(enrollment)

        attempt.review = review
        return Response(
            AttemptResultSerializer(attempt).data, status=status.HTTP_201_CREATED
        )


class QuizAdminViewSet(viewsets.ModelViewSet):

    serializer_class = QuizWriteSerializer
    permission_classes = [IsCourseAuthorOrAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = Quiz.objects.prefetch_related('questions__answers').select_related(
            'module__course', 'course'
        )
        if not getattr(self.request.user, 'is_admin_role', False):
            uid = self.request.user.id
            qs = qs.filter(Q(course__author_id=uid) | Q(module__course__author_id=uid))
        course = self.request.query_params.get('course')
        module = self.request.query_params.get('module')
        if course:
            qs = qs.filter(Q(course_id=course) | Q(module__course_id=course))
        if module:
            qs = qs.filter(module_id=module)
        return qs.order_by('id')

    def _target_course(self, validated_data):
        course = validated_data.get('course')
        if course is not None:
            return course
        module = validated_data.get('module')
        return module.course if module is not None else None

    def _guard(self, validated_data):
        course = self._target_course(validated_data)
        if course is not None and not can_manage_course(self.request.user, course):
            raise PermissionDenied('You can only author quizzes in courses you own.')

    def perform_create(self, serializer):
        self._guard(serializer.validated_data)
        serializer.save()

    def perform_update(self, serializer):
        self._guard(serializer.validated_data)
        serializer.save()
