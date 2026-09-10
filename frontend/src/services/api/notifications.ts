import type { AppNotification, Paginated } from '@/types';
import { http } from '../http';
import { mapNotification, mapPaginated } from './mappers';

export const notificationsService = {
  async list(unreadOnly = false): Promise<Paginated<AppNotification>> {
    const params: Record<string, string> = {};
    if (unreadOnly) params.unread = 'true';
    const { data } = await http.get('/notifications/', { params });
    return mapPaginated(data, mapNotification);
  },

  async unreadCount(): Promise<number> {
    const { data } = await http.get('/notifications/unread-count/');
    return (data as { count: number }).count;
  },

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await http.post(`/notifications/${id}/read/`, {});
    return mapNotification(data);
  },

  async markAllRead(): Promise<number> {
    const { data } = await http.post('/notifications/read-all/', {});
    return (data as { updated: number }).updated;
  },
};
