from django.urls import path

from .views import SsoCallbackView, SsoExchangeView, SsoLoginView

urlpatterns = [
    path('login/', SsoLoginView.as_view(), name='sso-login'),
    path('callback/', SsoCallbackView.as_view(), name='sso-callback'),
    path('exchange/', SsoExchangeView.as_view(), name='sso-exchange'),
]
