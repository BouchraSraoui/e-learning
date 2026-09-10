from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(ListAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    throttle_scope = 'notifications'

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        return qs


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = 'notifications'

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        n = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not n.is_read:
            n.is_read = True
            n.save(update_fields=['is_read'])
        return Response(NotificationSerializer(n).data)


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True
        )
        return Response({'updated': updated})
