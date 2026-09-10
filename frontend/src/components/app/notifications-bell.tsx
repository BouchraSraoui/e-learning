'use client';

import {
  Award,
  Bell,
  BookOpen,
  CalendarClock,
  Clock,
  Medal,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/types';

export const NOTIF_ICON: Record<NotificationType, LucideIcon> = {
  enrollment: BookOpen,
  certificate: Award,
  badge: Medal,
  comment_reply: MessageSquare,
  new_course: Sparkles,
  reminder: Clock,
  deadline: CalendarClock,
};

export const NOTIF_TONE: Record<NotificationType, string> = {
  enrollment: 'bg-primary-50 text-primary-600',
  certificate: 'bg-amber-50 text-amber-600',
  badge: 'bg-violet-50 text-violet-600',
  comment_reply: 'bg-cyan-50 text-cyan-600',
  new_course: 'bg-emerald-50 text-emerald-600',
  reminder: 'bg-slate-100 text-slate-500',
  deadline: 'bg-rose-50 text-rose-600',
};

export function NotificationsBell() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unread = 0 } = useUnreadCount();
  const { data: page, refetch, isFetching } = useNotifications(false);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const items = page?.results.slice(0, 8) ?? [];

  // The header keeps this query mounted for the whole session, so it never gets
  // a mount refetch — the polled badge count moves on while the list stays
  // frozen at page load. Refetch whenever the dropdown opens.
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.url) router.push(n.url);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line text-slate-600 hover:bg-slate-50"
        aria-label={t('title')}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-pop animate-scale-in">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">{t('title')}</p>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-slim">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                {isFetching ? tc('loading') : t('empty')}
              </p>
            ) : (
              items.map((n) => (
                <NotificationRow key={n.id} notification={n} onClick={() => openItem(n)} />
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-slate-50"
          >
            {t('viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick?: () => void;
}) {
  const Icon = NOTIF_ICON[notification.type] ?? Bell;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-slate-50',
        !notification.isRead && 'bg-primary-50/40',
      )}
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', NOTIF_TONE[notification.type])}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{notification.title}</span>
        {notification.body && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{notification.body}</span>
        )}
      </span>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
