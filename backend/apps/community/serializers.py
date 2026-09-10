import nh3
from rest_framework import serializers

from .models import ChatRoom


def clean_message(body: str) -> str:
    return nh3.clean(body or '', tags=set(), attributes={}).strip()


def message_payload(msg, request=None) -> dict:
    author = msg.author
    avatar = None
    if request is not None and getattr(author, 'avatar', None):
        avatar = request.build_absolute_uri(author.avatar.url)
    return {
        'id': msg.id,
        'room': msg.room.slug,
        'author': author.id,
        'author_name': author.full_name or author.email,
        'author_avatar': avatar,
        'author_role': author.role,
        'body': '' if msg.is_deleted else msg.body,
        'is_deleted': msg.is_deleted,
        'created_at': msg.created_at.isoformat(),
    }


class ChatRoomSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'slug', 'name', 'description', 'is_active', 'message_count', 'created_at']

    def get_message_count(self, obj) -> int:
        return obj.messages.filter(is_deleted=False).count()


class MessageInputSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000)

    def validate_body(self, value):
        cleaned = clean_message(value)
        if not cleaned:
            raise serializers.ValidationError('Message cannot be empty.')
        return cleaned
