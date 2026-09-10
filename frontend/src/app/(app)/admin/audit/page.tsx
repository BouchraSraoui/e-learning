'use client';

import {
  BookMarked,
  BookMinus,
  BookPlus,
  FileDown,
  type LucideIcon,
  PencilLine,
  ScrollText,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { RoleGuard } from '@/components/app/role-guard';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useAuditLog } from '@/hooks/use-management';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/types';

type ActionTone = 'success' | 'primary' | 'danger' | 'violet' | 'warning' | 'neutral';

interface ActionMeta {
  labelKey: string;
  icon: LucideIcon;
  tone: ActionTone;
}

/** Maps a stored `noun.verb` action to a human-readable label, icon and colour. */
const ACTION_META: Record<string, ActionMeta> = {
  'user.create': { labelKey: 'actionUserCreate', icon: UserPlus, tone: 'success' },
  'user.update': { labelKey: 'actionUserUpdate', icon: PencilLine, tone: 'primary' },
  'user.delete': { labelKey: 'actionUserDelete', icon: Trash2, tone: 'danger' },
  'user.import': { labelKey: 'actionUserImport', icon: Users, tone: 'violet' },
  'assignment.create': { labelKey: 'actionAssignmentCreate', icon: BookMarked, tone: 'success' },
  'assignment.delete': { labelKey: 'actionAssignmentDelete', icon: UserMinus, tone: 'warning' },
  'report.export': { labelKey: 'actionReportExport', icon: FileDown, tone: 'neutral' },
  'course.create': { labelKey: 'actionCourseCreate', icon: BookPlus, tone: 'success' },
  'course.delete': { labelKey: 'actionCourseDelete', icon: BookMinus, tone: 'danger' },
};

const ICON_TONE: Record<ActionTone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  primary: 'bg-primary-50 text-primary-700',
  danger: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-500',
};

interface DateGroup {
  key: string;
  date: Date;
  entries: AuditEntry[];
}

/** Buckets entries (already ordered newest-first) into per-day groups, order preserved. */
function groupByDay(entries: AuditEntry[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = date.toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, date, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function AuditInner() {
  const t = useTranslations('audit');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch } = useAuditLog(page);

  const groups = useMemo(() => (data ? groupByDay(data.results) : []), [data]);

  const dayLabel = (date: Date) => {
    const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
    if (diff === 0) return t('today');
    if (diff === 1) return t('yesterday');
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      {isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : data.count === 0 ? (
        <EmptyState icon={ScrollText} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <>
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ink first-letter:capitalize">
                    {dayLabel(group.date)}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {t('eventCount', { count: group.entries.length })}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-line bg-white">
                  <ul className="divide-y divide-line">
                    {group.entries.map((entry) => {
                      const meta = ACTION_META[entry.action];
                      const Icon = meta?.icon ?? ScrollText;
                      return (
                        <li key={entry.id} className="flex items-start gap-4 px-4 py-3.5">
                          <span
                            className={cn(
                              'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                              ICON_TONE[meta?.tone ?? 'neutral'],
                            )}
                          >
                            <Icon size={17} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-ink">
                              <span className="font-semibold">
                                {entry.actorName ?? t('actorSystem')}
                              </span>{' '}
                              <span className="text-slate-600">
                                {meta ? t(meta.labelKey) : entry.action}
                              </span>
                            </p>
                            {entry.targetRepr ? (
                              <p className="mt-0.5 truncate text-xs text-muted">{entry.targetRepr}</p>
                            ) : null}
                          </div>
                          <time className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">
                            {timeLabel(entry.createdAt)}
                          </time>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span>{t('count', { count: data.count })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tc('back')}
              </Button>
              <span className="tabular-nums">{t('pageOf', { page, pages: data.pages })}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <RoleGuard roles={['admin']}>
      <AuditInner />
    </RoleGuard>
  );
}
