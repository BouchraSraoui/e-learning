import {
  type AdminUserFilters,
  type AdminUserInput,
  type DownloadFile,
  type Paginated,
  type ProfileUpdate,
  type User,
  type UserImportReport,
} from '@/types';
import { http } from '../http';
import { mapImportReport, mapPaginated, mapUser, toAdminUserPayload } from './mappers';

function toAdminParams(f: AdminUserFilters = {}): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (f.search) params.search = f.search;
  if (f.role) params.role = f.role;
  if (f.department) params.department = f.department;
  if (f.active !== undefined) params.is_active = f.active;
  if (f.ordering) params.ordering = f.ordering;
  if (f.page) params.page = f.page;
  if (f.pageSize) params.page_size = f.pageSize;
  return params;
}

function filenameFrom(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

function toApiPatch(patch: ProfileUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.lastName !== undefined) out.last_name = patch.lastName;
  if (patch.jobTitle !== undefined) out.job_title = patch.jobTitle;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.location !== undefined) out.location = patch.location;
  if (patch.bio !== undefined) out.bio = patch.bio;
  if (patch.language !== undefined) out.language = patch.language;
  if (patch.emailNotifications !== undefined) out.email_notifications = patch.emailNotifications;
  return out;
}

export const usersService = {
  async getById(id: string): Promise<User> {
    const { data } = await http.get(`/admin/users/${id}/`);
    return mapUser(data);
  },

  async list(): Promise<User[]> {
    const { data } = await http.get('/admin/users/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapUser);
  },

  async updateProfile(_id: string, patch: ProfileUpdate): Promise<User> {
    const { data } = await http.patch('/auth/me/', toApiPatch(patch));
    return mapUser(data);
  },

  async updateAvatar(file: File | null): Promise<User> {
    if (file === null) {
      const { data } = await http.delete('/auth/me/avatar/');
      return mapUser(data);
    }
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await http.post('/auth/me/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapUser(data);
  },

  async changePassword(_id: string, current: string, next: string): Promise<void> {
    await http.post('/auth/password/change/', {
      current_password: current,
      new_password: next,
    });
  },


  async adminList(filters: AdminUserFilters = {}): Promise<Paginated<User>> {
    const { data } = await http.get('/admin/users/', { params: toAdminParams(filters) });
    return mapPaginated(data, mapUser);
  },

  async create(input: AdminUserInput): Promise<User> {
    const { data } = await http.post('/admin/users/', toAdminUserPayload(input));
    return mapUser(data);
  },

  async update(id: string, input: AdminUserInput): Promise<User> {
    const { email: _email, ...rest } = input;
    const { data } = await http.patch(`/admin/users/${id}/`, toAdminUserPayload(rest as AdminUserInput));
    return mapUser(data);
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/admin/users/${id}/`);
  },

  async importUsers(file: File): Promise<UserImportReport> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await http.post('/admin/users/import/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapImportReport(data);
  },

  async exportUsers(fmt: 'csv' | 'xlsx', filters: AdminUserFilters = {}): Promise<DownloadFile> {
    const res = await http.get('/admin/users/export/', {
      params: { ...toAdminParams(filters), fmt },
      responseType: 'blob',
    });
    return {
      blob: res.data as Blob,
      filename: filenameFrom(res.headers['content-disposition'], `users.${fmt}`),
    };
  },

  async importTemplate(fmt: 'csv' | 'xlsx'): Promise<DownloadFile> {
    const res = await http.get('/admin/users/import-template/', {
      params: { fmt },
      responseType: 'blob',
    });
    return {
      blob: res.data as Blob,
      filename: filenameFrom(res.headers['content-disposition'], `users-template.${fmt}`),
    };
  },
};
