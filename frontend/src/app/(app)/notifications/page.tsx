'use client';

import { BellOff, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { NotificationRow } from '@/components/app/notifications-bell';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import type { AppNotification } from '@/types';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const router = useRouter();
  const { data: page, isPending } = useNotifications(false);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const items = page?.results ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.url) router.push(n.url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
        </div>
        {hasUnread && (
          <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            <CheckCheck size={16} />
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {isPending ? (
        <LoadingState label={tc('loading')} />
      ) : items.length === 0 ? (
        <EmptyState icon={BellOff} title={t('emptyTitle')} description={t('emptyHint')} />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationRow notification={n} onClick={() => open(n)} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
