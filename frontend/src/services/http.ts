import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clientLocale } from '@/i18n/client-locale';
import type { AccessMode } from '@/types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

const ACCESS_KEY = 'icosnet.access';
const REFRESH_KEY = 'icosnet.refresh';
const NETMODE_KEY = 'icosnet.netmode';
const isBrowser = typeof window !== 'undefined';

export const tokenStore = {
  get access(): string | null {
    return isBrowser ? window.localStorage.getItem(ACCESS_KEY) : null;
  },
  get refresh(): string | null {
    return isBrowser ? window.localStorage.getItem(REFRESH_KEY) : null;
  },
  set(access: string, refresh?: string | null) {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

// Simulated network origin for the On-net/Off-net demo (spec 2.6.2). The demo toggle
// writes it here so the request interceptor below can stamp every call with the
// X-Access-Mode header; the backend trusts that header only in demo mode (DEBUG +
// NET_MODE_DEMO) and otherwise derives the mode from the real client IP.
export const netModeStore = {
  get mode(): AccessMode {
    const v = isBrowser ? window.localStorage.getItem(NETMODE_KEY) : null;
    return v === 'off_net' ? 'off_net' : 'on_net';
  },
  set(mode: AccessMode) {
    if (!isBrowser) return;
    window.localStorage.setItem(NETMODE_KEY, mode);
  },
};

export const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = clientLocale();
  config.headers['X-Access-Mode'] = netModeStore.mode;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    const refresh = tokenStore.refresh;
    if (!refresh) return null;
    refreshing = axios
      .post(`${API_URL}/auth/refresh/`, { refresh })
      .then((res) => {
        const { access, refresh: rotated } = res.data as {
          access: string;
          refresh?: string;
        };
        tokenStore.set(access, rotated ?? refresh);
        return access;
      })
      .catch(() => {
        tokenStore.clear();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = config?.url ?? '';
    const isAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/sso/');

    if (error.response?.status === 401 && config && !config._retry && !isAuthCall) {
      config._retry = true;
      const access = await refreshAccess();
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
        return http(config);
      }
    }
    return Promise.reject(error);
  },
);
