from django.urls import path

from .views import (
    AvatarView,
    ForgotPasswordView,
    LoginView,
    LogoutAllView,
    LogoutView,
    MeView,
    PasswordChangeView,
    RefreshView,
    RegisterView,
    ResetPasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('logout-all/', LogoutAllView.as_view(), name='logout-all'),
    path('me/', MeView.as_view(), name='me'),
    path('me/avatar/', AvatarView.as_view(), name='me-avatar'),
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
    path('password/forgot/', ForgotPasswordView.as_view(), name='password-forgot'),
    path('password/reset/', ResetPasswordView.as_view(), name='password-reset'),
]
