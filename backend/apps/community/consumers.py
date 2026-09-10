from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .serializers import clean_message, message_payload


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.room_slug = self.scope['url_route']['kwargs']['room_slug']
        self.group_name = f'chat_{self.room_slug}'
        if not await self._can_access(user, self.room_slug):
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        user = self.scope['user']
        action = content.get('action', 'message')

        if action == 'message':
            body = clean_message(content.get('body', ''))
            if not body:
                return
            if await self._is_banned(user, self.room_slug):
                await self.send_json({'type': 'error', 'code': 'banned'})
                return
            payload = await self._save_message(user, self.room_slug, body)
            await self.channel_layer.group_send(
                self.group_name, {'type': 'chat.message', 'message': payload}
            )
        elif action == 'delete':
            msg_id = content.get('id')
            ok = await self._delete_message(user, msg_id)
            if not ok:
                await self.send_json({'type': 'error', 'code': 'forbidden'})
                return
            await self.channel_layer.group_send(
                self.group_name, {'type': 'chat.deleted', 'id': msg_id}
            )

    async def chat_message(self, event):
        await self.send_json({'type': 'message', 'message': event['message']})

    async def chat_deleted(self, event):
        await self.send_json({'type': 'deleted', 'id': event['id']})

    @database_sync_to_async
    def _can_access(self, user, slug):
        from .models import ChatBan, ChatRoom

        if not ChatRoom.objects.filter(slug=slug, is_active=True).exists():
            return False
        return not ChatBan.objects.filter(room__slug=slug, user=user).exists()

    @database_sync_to_async
    def _is_banned(self, user, slug):
        from .models import ChatBan

        return ChatBan.objects.filter(room__slug=slug, user=user).exists()

    @database_sync_to_async
    def _save_message(self, user, slug, body):
        from .models import ChatMessage, ChatRoom

        room = ChatRoom.objects.get(slug=slug)
        msg = ChatMessage.objects.create(room=room, author=user, body=body)
        return message_payload(msg)

    @database_sync_to_async
    def _delete_message(self, user, msg_id):
        from apps.accounts.models import Role

        from .models import ChatMessage

        msg = (
            ChatMessage.objects.filter(id=msg_id, room__slug=self.room_slug)
            .select_related('room', 'author')
            .first()
        )
        if not msg:
            return False
        is_mod = user.is_admin_role or user.role == Role.MANAGER
        if not (is_mod or msg.author_id == user.id):
            return False
        msg.is_deleted = True
        msg.deleted_by = user
        msg.save(update_fields=['is_deleted', 'deleted_by'])
        return True
