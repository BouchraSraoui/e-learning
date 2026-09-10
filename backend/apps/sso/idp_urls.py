"""DEMO IdP routes — included only when settings.SSO_DEMO_IDP is true (dev)."""
from django.urls import path

from . import idp_demo

urlpatterns = [
    path('.well-known/openid-configuration', idp_demo.openid_configuration, name='oidc-demo-config'),
    path('jwks', idp_demo.jwks, name='oidc-demo-jwks'),
    path('authorize', idp_demo.authorize, name='oidc-demo-authorize'),
    path('token', idp_demo.token, name='oidc-demo-token'),
    path('userinfo', idp_demo.userinfo, name='oidc-demo-userinfo'),
]
