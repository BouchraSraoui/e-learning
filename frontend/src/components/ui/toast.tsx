'use client';

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-primary-600',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = Math.random().toString(36).slice(2);
      setItems((list) => [...list, { tone: 'info', ...input, id }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error' }),
      info: (title, description) => push({ title, description, tone: 'info' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        {items.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop"
              role="status"
            >
              <Icon size={20} className={cn('mt-0.5 shrink-0', TONE_STYLE[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-sm text-muted">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
