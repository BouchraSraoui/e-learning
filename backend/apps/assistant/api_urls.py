from rest_framework.routers import SimpleRouter

from .views import AdminFaqViewSet, AssistantAskView, FaqListView
from django.urls import path

router = SimpleRouter()
router.register('admin/faq', AdminFaqViewSet, basename='admin-faq')

urlpatterns = [
    path('faq/', FaqListView.as_view(), name='faq-list'),
    path('assistant/ask/', AssistantAskView.as_view(), name='assistant-ask'),
    *router.urls,
]
