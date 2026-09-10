import type { Category, Department } from '@/types';
import { http } from '../http';
import { mapCategory, mapDepartment } from './mappers';

export const referenceService = {
  async departments(): Promise<Department[]> {
    const { data } = await http.get('/departments/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapDepartment);
  },

  async categories(): Promise<Category[]> {
    const { data } = await http.get('/categories/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapCategory);
  },
};
