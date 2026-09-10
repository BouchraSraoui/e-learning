import type { NetworkStatus } from '@/types';
import { http } from '../http';

// On-net / Off-net access mode (spec 2.6.2). Reports the mode the backend resolved
// for the current request — from the real client IP in production, or the simulated
// X-Access-Mode header in the dev demo. Drives the access-mode badge in the app shell.
export const networkService = {
  async getStatus(): Promise<NetworkStatus> {
    const { data } = await http.get('/net/status/');
    return {
      mode: data.mode === 'off_net' ? 'off_net' : 'on_net',
      onNet: Boolean(data.on_net),
      demo: Boolean(data.demo),
    };
  },
};
