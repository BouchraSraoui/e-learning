'use client';

import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EnrollmentCard } from '@/components/app/enrollment-card';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { Tabs } from '@/components/ui/tabs';
import { useMyEnrollments } from '@/hooks/use-enrollment';
import type { EnrollmentStatus } from '@/types';

type Filter = 'all' | EnrollmentStatus;

const STATUS_ORDER: Record<EnrollmentStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

export default function MyLearningPage() {
  const t = useTranslations('myLearning');
  const tc = useTranslations('common');
  const { data: enrollments, isPending } = useMyEnrollments();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const list = [...(enrollments ?? [])].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    );
    return filter === 'all' ? list : list.filter((e) => e.status === filter);
  }, [enrollments, filter]);

  if (isPending) return <LoadingState label={tc('loading')} />;
  const all = enrollments ?? [];

  const counts = {
    all: all.length,
    in_progress: all.filter((e) => e.status === 'in_progress').length,
    completed: all.filter((e) => e.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('emptyTitle')}
          description={t('emptyHint')}
          action={
            <Link href="/catalog">
              <Button>{t('browseCatalog')}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Tabs
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            tabs={[
              { value: 'all', label: t('filterAll', { count: counts.all }) },
              { value: 'in_progress', label: t('filterInProgress', { count: counts.in_progress }) },
              { value: 'completed', label: t('filterCompleted', { count: counts.completed }) },
            ]}
          />

          {rows.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('noneInFilter')} className="py-10" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((e) => (
                <EnrollmentCard key={e.id} enrollment={e} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
