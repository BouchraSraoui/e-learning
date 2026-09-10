from django.urls import path
from rest_framework.routers import DefaultRouter

from .analytics import AdminAnalyticsView
from .dashboard import DashboardView
from .views import (
    AssignmentViewSet,
    CertificateDownloadView,
    CertificateListView,
    EnrollmentDetailView,
    EnrollmentListCreateView,
    LessonMediaView,
    LessonProgressView,
    ReportExportView,
    ReportView,
    VerifyView,
)

router = DefaultRouter()
router.register('assignments', AssignmentViewSet, basename='assignment')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('admin/reports/', ReportView.as_view(), name='admin-reports'),
    path('admin/reports/export/', ReportExportView.as_view(), name='admin-reports-export'),
    path('enrollments/', EnrollmentListCreateView.as_view(), name='enrollment-list'),
    path('enrollments/<slug:slug>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path('lessons/<int:pk>/progress/', LessonProgressView.as_view(), name='lesson-progress'),
    path('lessons/<int:pk>/media/', LessonMediaView.as_view(), name='lesson-media'),
    path('certificates/', CertificateListView.as_view(), name='certificate-list'),
    path('certificates/<str:code>/download/', CertificateDownloadView.as_view(), name='certificate-download'),
    path('verify/<str:code>/', VerifyView.as_view(), name='verify'),
    *router.urls,
]
