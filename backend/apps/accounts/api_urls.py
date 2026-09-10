from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdminUserViewSet, AuditLogListView, DepartmentViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet, basename='department')
router.register('admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('admin/audit/', AuditLogListView.as_view(), name='audit-log'),
    *router.urls,
]
