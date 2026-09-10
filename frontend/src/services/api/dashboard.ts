import type { LearnerDashboard } from '@/types';
import { http } from '../http';
import { mapDashboard } from './mappers';

export const dashboardService = {
  async get(): Promise<LearnerDashboard> {
    const { data } = await http.get('/dashboard/');
    return mapDashboard(data);
  },
};
