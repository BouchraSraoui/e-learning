from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CourseViewSet,
    LandingPreviewView,
    LearningPathViewSet,
    LessonViewSet,
    ModuleViewSet,
    ResourceViewSet,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('courses', CourseViewSet, basename='course')
router.register('modules', ModuleViewSet, basename='module')
router.register('lessons', LessonViewSet, basename='lesson')
router.register('resources', ResourceViewSet, basename='resource')
router.register('learning-paths', LearningPathViewSet, basename='learning-path')

urlpatterns = [
    # Before the router so it isn't swallowed by the course detail slug route.
    path('courses/landing-preview/', LandingPreviewView.as_view(), name='landing-preview'),
    *router.urls,
]
