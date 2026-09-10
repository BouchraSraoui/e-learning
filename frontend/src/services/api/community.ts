import type { ChatMessage, ChatRoom, RoomConnection, RoomHandlers } from '@/types';
import { API_URL, http, tokenStore } from '../http';
import { mapChatMessage, mapChatRoom } from './mappers';

function wsBase(): string {
  return API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
}

export const communityService = {
  async listRooms(): Promise<ChatRoom[]> {
    const { data } = await http.get('/rooms/');
    return (data as unknown[]).map((r) => mapChatRoom(r as never));
  },

  async getMessages(roomSlug: string): Promise<ChatMessage[]> {
    const { data } = await http.get(`/rooms/${roomSlug}/messages/`);
    return (data as unknown[]).map((m) => mapChatMessage(m as never));
  },

  async sendMessage(roomSlug: string, body: string): Promise<ChatMessage> {
    const { data } = await http.post(`/rooms/${roomSlug}/messages/`, { body });
    return mapChatMessage(data);
  },

  async deleteMessage(id: string): Promise<void> {
    await http.delete(`/messages/${id}/`);
  },

  async banUser(roomSlug: string, userId: string): Promise<void> {
    await http.post(`/rooms/${roomSlug}/ban/`, { user_id: userId });
  },

  connectRoom(roomSlug: string, handlers: RoomHandlers): RoomConnection {
    const token = tokenStore.access;
    const url = `${wsBase()}/ws/chat/${roomSlug}/${token ? `?token=${token}` : ''}`;
    const pending: string[] = [];
    let closedByUs = false;
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(url);
    } catch {
      socket = null;
    }

    if (socket) {
      socket.onopen = () => {
        pending.splice(0).forEach((b) =>
          socket!.send(JSON.stringify({ action: 'message', body: b })),
        );
      };
      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'message') handlers.onMessage(mapChatMessage(data.message));
          else if (data.type === 'deleted') handlers.onDeleted(String(data.id));
          else if (data.type === 'error') handlers.onError?.(data.code);
        } catch {
        }
      };
      socket.onerror = () => handlers.onError?.('socket_error');
      socket.onclose = () => {
        const buffered = pending.splice(0);
        socket = null;
        if (closedByUs) return;
        buffered.forEach((b) =>
          void communityService
            .sendMessage(roomSlug, b)
            .then(handlers.onMessage)
            .catch(() => handlers.onError?.('send_failed')),
        );
        handlers.onError?.('disconnected');
      };
    }

    return {
      send: (body: string) => {
        if (!socket) {
          void communityService
            .sendMessage(roomSlug, body)
            .then(handlers.onMessage)
            .catch(() => handlers.onError?.('send_failed'));
          return;
        }
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'message', body }));
        } else {
          pending.push(body);
        }
      },
      remove: (messageId: string) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'delete', id: Number(messageId) }));
        } else {
          void communityService
            .deleteMessage(messageId)
            .then(() => handlers.onDeleted(messageId))
            .catch(() => handlers.onError?.('delete_failed'));
        }
      },
      close: () => {
        closedByUs = true;
        socket?.close();
      },
    };
  },
};
