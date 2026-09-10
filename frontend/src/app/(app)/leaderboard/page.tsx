'use client';

import { Medal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/states';
import { Tabs } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/use-gamification';
import { cn } from '@/lib/utils';
import type { LeaderboardRow, LeaderboardScope } from '@/types';

const RANK_COLOR: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-slate-200 text-slate-600',
  3: 'bg-orange-100 text-orange-700',
};

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const tc = useTranslations('common');
  const [scope, setScope] = useState<LeaderboardScope>('all');
  const { data, isPending } = useLeaderboard(scope);

  const meInList = data?.results.some((r) => r.isMe);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
      </div>

      <Tabs
        value={scope}
        onChange={(v) => setScope(v as LeaderboardScope)}
        tabs={[
          { value: 'all', label: t('scopeAll') },
          { value: 'department', label: t('scopeDepartment') },
        ]}
      />

      {isPending || !data ? (
        <LoadingState label={tc('loading')} />
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {data.results.map((row) => (
                <Row key={row.userId} row={row} youLabel={t('you')} />
              ))}
              {!meInList && (
                <>
                  <li className="px-4 py-1.5 text-center text-xs text-muted">···</li>
                  <Row row={data.me} youLabel={t('you')} />
                </>
              )}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ row, youLabel }: { row: LeaderboardRow; youLabel: string }) {
  const t = useTranslations('leaderboard');
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        row.isMe && 'bg-primary-50/60',
      )}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold',
          RANK_COLOR[row.rank] ?? 'bg-slate-100 text-slate-500',
        )}
      >
        {row.rank}
      </span>
      <Avatar name={row.name} src={row.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
          {row.name}
          {row.isMe && <Badge tone="primary">{youLabel}</Badge>}
        </p>
        {row.department && <p className="truncate text-xs text-muted">{row.department}</p>}
      </div>
      <span className="hidden items-center gap-1 text-xs text-muted sm:inline-flex">
        <Medal size={14} className="text-amber-500" />
        {t('badgesCount', { count: row.badges })}
      </span>
      <span className="w-16 text-end text-sm font-bold text-primary">{row.points}</span>
    </li>
  );
}
