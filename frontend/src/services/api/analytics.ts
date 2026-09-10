import type { AdminAnalytics } from '@/types';
import { http } from '../http';
import { mapAnalytics } from './mappers';

export const analyticsService = {
  async overview(): Promise<AdminAnalytics> {
    const { data } = await http.get('/admin/analytics/');
    return mapAnalytics(data);
  },
};
