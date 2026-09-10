import type { Certificate, VerifyResult } from '@/types';
import { API_URL, http, tokenStore } from '../http';
import { mapCertificate, mapVerify } from './mappers';

export const certificatesService = {
  async list(): Promise<Certificate[]> {
    const { data } = await http.get('/certificates/');
    return (data as unknown[]).map((c) => mapCertificate(c as never));
  },

  async verify(code: string): Promise<VerifyResult> {
    try {
      const { data } = await http.get(`/verify/${code}/`);
      return mapVerify(data);
    } catch (err) {
      const resp = (err as { response?: { status?: number; data?: unknown } }).response;
      if (resp?.status === 404) return mapVerify(resp.data as never);
      throw err;
    }
  },

  downloadUrl(code: string): string {
    const base = `${API_URL}/certificates/${code}/download/`;
    const token = tokenStore.access;
    return token ? `${base}?token=${token}` : base;
  },
};
