'use client';

import { Award, BookOpen, GraduationCap, PieChart, Target, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RoleGuard } from '@/components/app/role-guard';
import { StatCard } from '@/components/app/stat-card';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAnalytics } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';
import type { Accent } from '@/types';

const BAR_TONE: Record<string, string> = {
  primary: 'bg-primary',
  brand: 'bg-brand',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

function Meter({
  label,
  value,
  max,
  tone = 'primary',
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  tone?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((100 * value) / max) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-ink">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', BAR_TONE[tone] ?? BAR_TONE.primary)}
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function AnalyticsInner() {
  const t = useTranslations('analytics');
  const tRoles = useTranslations('roles');
  const tc = useTranslations('common');
  const { data, isPending, isError, refetch } = useAnalytics();

  if (isError) return <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  if (isPending || !data) return <LoadingState label={tc('loading')} />;

  const roleMax = Math.max(1, ...Object.values(data.users.byRole));
  const enrollMax = Math.max(1, data.enrollments.total);
  const catMax = Math.max(1, ...data.categoryBreakdown.map((c) => c.enrollments));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} tone="primary" value={data.users.total} label={t('totalUsers')} />
        <StatCard icon={BookOpen} tone="brand" value={data.courses.published} label={t('publishedCourses')} />
        <StatCard icon={GraduationCap} tone="violet" value={data.enrollments.total} label={t('totalEnrollments')} />
        <StatCard icon={Target} tone="emerald" value={`${data.enrollments.completionRate}%`} label={t('completionRate')} />
        <StatCard icon={Award} tone="amber" value={data.certificates} label={t('certificatesIssued')} />
        <StatCard icon={PieChart} tone="primary" value={`${data.avgQuizScore}%`} label={t('avgQuizScore')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('usersByRole')} />
          <CardBody className="space-y-3 pt-0">
            <Meter label={tRoles('user')} value={data.users.byRole.user} max={roleMax} tone="primary" />
            <Meter label={tRoles('manager')} value={data.users.byRole.manager} max={roleMax} tone="violet" />
            <Meter label={tRoles('admin')} value={data.users.byRole.admin} max={roleMax} tone="amber" />
            <p className="pt-1 text-xs text-muted">
              {t('activeInactive', { active: data.users.active, inactive: data.users.inactive })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('enrollmentFunnel')} />
          <CardBody className="space-y-3 pt-0">
            <Meter label={t('notStarted')} value={data.enrollments.notStarted} max={enrollMax} tone="rose" />
            <Meter label={t('inProgress')} value={data.enrollments.inProgress} max={enrollMax} tone="amber" />
            <Meter label={t('completed')} value={data.enrollments.completed} max={enrollMax} tone="emerald" />
            <p className="pt-1 text-xs text-muted">
              {t('draftPublished', { published: data.courses.published, draft: data.courses.draft })}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('topCourses')} />
        <CardBody className="pt-0">
          {data.topCourses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t('noEnrollmentsYet')}</p>
          ) : (
            <ul className="space-y-4">
              {data.topCourses.map((c) => (
                <li key={c.slug}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-ink">{c.title}</span>
                    <span className="shrink-0 text-muted">
                      {t('enrollBadge', { count: c.enrollments })} · {c.completionRate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(c.completionRate, 3)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('byCategory')} />
        <CardBody className="space-y-3 pt-0">
          {data.categoryBreakdown.map((c) => (
            <Meter
              key={c.name}
              label={t('categoryLabel', { name: c.name, courses: c.courses })}
              value={c.enrollments}
              max={catMax}
              tone={(c.accent as Accent) ?? 'primary'}
              suffix={` ${t('enrollmentsSuffix')}`}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard roles={['admin']}>
      <AnalyticsInner />
    </RoleGuard>
  );
}
