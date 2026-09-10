from django.urls import path

from .views import (
    BadgeListView,
    CommentDetailView,
    CommentListCreateView,
    CommentModerateView,
    CommentReactView,
    CourseFeedbackView,
    LeaderboardView,
)

urlpatterns = [
    path('comments/', CommentListCreateView.as_view(), name='comment-list'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/react/', CommentReactView.as_view(), name='comment-react'),
    path('comments/<int:pk>/moderate/', CommentModerateView.as_view(), name='comment-moderate'),
    path('courses/<slug:slug>/feedback/', CourseFeedbackView.as_view(), name='course-feedback'),
    path('badges/', BadgeListView.as_view(), name='badge-list'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
]
