'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { services } from '@/services';
import type { Credentials, RegisterInput, User } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<User>;
  completeSsoLogin: (code: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  applyUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    services.auth
      .getSession()
      .then((session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setStatus(session ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (!active) return;
        setStatus('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  // The query cache is keyed by endpoint, not by account — drop it whenever
  // the signed-in identity changes so one user's data never leaks to the next.
  const login = useCallback(
    async (credentials: Credentials) => {
      const session = await services.auth.login(credentials);
      qc.clear();
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    },
    [qc],
  );

  // SSO completion: trade the one-time hand-off code for a JWT pair, then flip the
  // guard to authenticated exactly like login (applyUser alone won't move status).
  const completeSsoLogin = useCallback(
    async (code: string) => {
      const session = await services.auth.exchangeSso(code);
      qc.clear();
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    },
    [qc],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await services.auth.register(input);
      qc.clear();
      setUser(session.user);
      setStatus('authenticated');
      return session.user;
    },
    [qc],
  );

  const logout = useCallback(async () => {
    await services.auth.logout();
    qc.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, [qc]);

  const applyUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      completeSsoLogin,
      register,
      logout,
      applyUser,
    }),
    [user, status, login, completeSsoLogin, register, logout, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
