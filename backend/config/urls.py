from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.health import health
from apps.common.network import network_status

urlpatterns = [
    path('admin/', admin.site.urls),#i thisnk hna kan error nrdo(django-admin) yt3ardh m3a next.js
    path('api/health/', health, name='health'),
    path('api/net/status/', network_status, name='net-status'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/auth/sso/', include('apps.sso.urls')),
    path('api/', include('apps.accounts.api_urls')),
    path('api/', include('apps.courses.api_urls')),
    path('api/', include('apps.progress.api_urls')),
    path('api/', include('apps.assessments.api_urls')),
    path('api/', include('apps.engagement.api_urls')),
    path('api/', include('apps.community.api_urls')),
    path('api/', include('apps.notifications.api_urls')),
    path('api/', include('apps.assistant.api_urls')),
]

# Demo OIDC identity provider — dev only. Gated on BOTH the flag AND DEBUG so it
# can never mount in a production (DEBUG=False) process even if the flag leaks in.
if settings.SSO_DEMO_IDP and settings.DEBUG:
    urlpatterns += [path('oidc-demo/', include('apps.sso.idp_urls'))]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
