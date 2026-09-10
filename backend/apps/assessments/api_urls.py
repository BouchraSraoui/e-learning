from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import QuizAdminViewSet, QuizAttemptListCreateView, QuizDetailView

router = DefaultRouter()
router.register('admin/quizzes', QuizAdminViewSet, basename='admin-quiz')

urlpatterns = [
    path('quizzes/<int:pk>/', QuizDetailView.as_view(), name='quiz-detail'),
    path('quizzes/<int:quiz_id>/attempts/', QuizAttemptListCreateView.as_view(), name='quiz-attempts'),
    *router.urls,
]
