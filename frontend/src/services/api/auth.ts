import axios from 'axios';
import {
  type Credentials,
  type RegisterInput,
  type ResetPasswordPayload,
  type Session,
  ServiceError,
} from '@/types';
import { http, tokenStore } from '../http';
import { mapUser } from './mappers';

function sessionFrom(data: { access: string; refresh: string; user: unknown }): Session {
  tokenStore.set(data.access, data.refresh);
  return {
    user: mapUser(data.user as never),
    token: data.access,
    issuedAt: new Date().toISOString(),
  };
}

export const authService = {
  async login({ email, password }: Credentials): Promise<Session> {
    try {
      const { data } = await http.post('/auth/login/', { email, password });
      return sessionFrom(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        throw new ServiceError('invalid_credentials');
      }
      throw new ServiceError('server_error');
    }
  },

  async exchangeSso(code: string): Promise<Session> {
    try {
      const { data } = await http.post('/auth/sso/exchange/', { code });
      return sessionFrom(data);
    } catch {
      throw new ServiceError('sso_exchange_failed');
    }
  },

  async register(input: RegisterInput): Promise<Session> {
    try {
      const { data } = await http.post('/auth/register/', {
        full_name: input.fullName,
        email: input.email,
        department: input.departmentId || null,
        password: input.password,
      });
      return sessionFrom(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const errors = (err.response.data as { errors?: Record<string, unknown> })?.errors;
        if (errors?.email) throw new ServiceError('email_taken');
        if (errors?.password) throw new ServiceError('weak_password');
      }
      throw new ServiceError('server_error');
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await http.post('/auth/password/forgot/', { email });
    } catch {
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await http.post('/auth/password/reset/', {
      uid: payload.uid,
      token: payload.token,
      new_password: payload.password,
    });
  },

  async getSession(): Promise<Session | null> {
    if (!tokenStore.access && !tokenStore.refresh) return null;
    try {
      const { data } = await http.get('/auth/me/');
      return {
        user: mapUser(data),
        token: tokenStore.access ?? '',
        issuedAt: new Date().toISOString(),
      };
    } catch {
      tokenStore.clear();
      return null;
    }
  },

  async logout(): Promise<void> {
    const refresh = tokenStore.refresh;
    try {
      if (refresh) await http.post('/auth/logout/', { refresh });
    } catch {
    }
    tokenStore.clear();
  },
};
