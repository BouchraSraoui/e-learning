'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { services } from '@/services';
import { netModeStore } from '@/services/http';
import type { AccessMode } from '@/types';
import { useAuth } from './auth-context';

// Whether the dev-only origin toggle is available (build-time flag, mirrors how
// NEXT_PUBLIC_SSO_ENABLED advertises the demo SSO). Off in production builds.
const IS_DEMO = process.env.NEXT_PUBLIC_NET_DEMO === 'true';

interface NetworkModeContextValue {
  mode: AccessMode;
  onNet: boolean;
  isDemo: boolean;
  loading: boolean;
  setMode: (mode: AccessMode) => void;
  refresh: () => Promise<void>;
}

const NetworkModeContext = createContext<NetworkModeContextValue | null>(null);

export function NetworkModeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Start from a constant so server and first client render agree; the persisted
  // toggle is hydrated in the mount effect below (avoids a hydration mismatch).
  const [mode, setModeState] = useState<AccessMode>('on_net');
  const [loading, setLoading] = useState(false);

  // Ask the backend which mode it resolved for us (authoritative — real client IP in
  // prod, the simulated header in demo) and reconcile the badge with it.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await services.network.getStatus();
      setModeState(status.mode);
      netModeStore.set(status.mode);
    } catch {
      // Keep the last known mode on a transient error rather than flapping.
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate the persisted demo toggle once mounted.
  useEffect(() => {
    setModeState(netModeStore.mode);
  }, []);

  // Sync with the server whenever the signed-in state becomes authenticated
  // (the status endpoint requires auth).
  useEffect(() => {
    if (isAuthenticated) void refresh();
  }, [isAuthenticated, refresh]);

  const setMode = useCallback(
    (next: AccessMode) => {
      netModeStore.set(next); // so the http interceptor stamps the new header
      setModeState(next); // optimistic
      if (isAuthenticated) void refresh(); // reconcile with the server's decision
    },
    [isAuthenticated, refresh],
  );

  const value = useMemo<NetworkModeContextValue>(
    () => ({
      mode,
      onNet: mode === 'on_net',
      isDemo: IS_DEMO,
      loading,
      setMode,
      refresh,
    }),
    [mode, loading, setMode, refresh],
  );

  return (
    <NetworkModeContext.Provider value={value}>{children}</NetworkModeContext.Provider>
  );
}

export function useNetworkMode(): NetworkModeContextValue {
  const ctx = useContext(NetworkModeContext);
  if (!ctx) throw new Error('useNetworkMode must be used within <NetworkModeProvider>');
  return ctx;
}
