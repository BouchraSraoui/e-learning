from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .broadcast import broadcast
from .models import ChatBan, ChatMessage, ChatRoom
from .serializers import ChatRoomSerializer, MessageInputSerializer, message_payload


def _is_moderator(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'is_admin_role', False)
            or getattr(user, 'role', None) == 'manager'
        )
    )


_ROLE_RANK = {'user': 0, 'manager': 1, 'admin': 2}


def _rank(user) -> int:
    if getattr(user, 'is_admin_role', False):
        return _ROLE_RANK['admin']
    return _ROLE_RANK.get(getattr(user, 'role', 'user'), 0)


class ChatRoomListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = None
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        return ChatRoom.objects.filter(is_active=True)


class RoomMessagesView(APIView):

    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        self.throttle_scope = 'chat' if self.request.method == 'POST' else None
        return super().get_throttles()

    def get(self, request, slug):
        room = get_object_or_404(ChatRoom.objects.filter(is_active=True), slug=slug)
        recent = list(
            ChatMessage.objects.filter(room=room, is_deleted=False)
            .select_related('author', 'room')
            .order_by('-created_at', '-id')[:100]
        )
        recent.reverse()
        return Response([message_payload(m, request) for m in recent])

    def post(self, request, slug):
        room = get_object_or_404(ChatRoom.objects.filter(is_active=True), slug=slug)
        if ChatBan.objects.filter(room=room, user=request.user).exists():
            return Response({'detail': 'You are banned from this room.', 'code': 'banned'},
                            status=status.HTTP_403_FORBIDDEN)
        ser = MessageInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        msg = ChatMessage.objects.create(room=room, author=request.user, body=ser.validated_data['body'])
        broadcast(slug, {'type': 'chat.message', 'message': message_payload(msg)})
        return Response(message_payload(msg, request), status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        msg = get_object_or_404(ChatMessage.objects.select_related('room', 'author'), pk=pk)
        if not (_is_moderator(request.user) or msg.author_id == request.user.id):
            return Response({'detail': 'Not allowed.', 'code': 'forbidden'},
                            status=status.HTTP_403_FORBIDDEN)
        msg.is_deleted = True
        msg.deleted_by = request.user
        msg.save(update_fields=['is_deleted', 'deleted_by'])
        broadcast(msg.room.slug, {'type': 'chat.deleted', 'id': msg.id})
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomBanView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        if not _is_moderator(request.user):
            return Response({'detail': 'Moderator only.', 'code': 'forbidden'},
                            status=status.HTTP_403_FORBIDDEN)
        room = get_object_or_404(ChatRoom, slug=slug)
        target = get_object_or_404(get_user_model(), pk=request.data.get('user_id'))
        if target.id == request.user.id or _rank(target) >= _rank(request.user):
            return Response({'detail': 'You cannot ban this user.', 'code': 'forbidden'},
                            status=status.HTTP_403_FORBIDDEN)
        ChatBan.objects.get_or_create(
            room=room, user=target,
            defaults={'created_by': request.user, 'reason': request.data.get('reason', '')},
        )
        return Response({'detail': 'User banned.', 'code': 'banned', 'user_id': target.id},
                        status=status.HTTP_201_CREATED)
