'use client';

import { Award, BookOpen, CirclePlay, CircleCheck, ClipboardList, Clock, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { CourseCard } from '@/components/catalog/course-card';
import { EnrollmentCard } from '@/components/app/enrollment-card';
import { StatCard } from '@/components/app/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import { useDashboard } from '@/hooks/use-dashboard';
import { accentTone, levelTone } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import type { AssignedItem, Certificate, MandatoryItem, TeamAssignment, TeamOverview } from '@/types';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const locale = useLocale();
  const { data, isPending } = useDashboard();

  if (!user) return null;

  const stats = data?.stats ?? { ...user.stats, mandatoryRemaining: 0 };
  const active = data?.continueLearning[0];
  const resumeHref = active ? `/learn/${active.course.slug}` : '/catalog';

  const now = new Date();
  const hour = now.getHours();
  const greetKey =
    hour < 12 ? 'greetingMorning' : hour < 18 ? 'greetingAfternoon' : 'greetingEvening';
  const dateLabel = now.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const continueLearning = data?.continueLearning ?? [];
  const mandatory = data?.mandatory ?? [];
  const assigned = data?.assigned ?? [];
  const team = data?.team ?? null;
  const recommendations = data?.recommendations ?? [];
  const certificates = data?.recentCertificates ?? [];
  const nothingStarted =
    !isPending && continueLearning.length === 0 && stats.coursesCompleted === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold capitalize text-primary">{dateLabel}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {t(greetKey, { name: user.firstName })} 👋
          </h2>
          <p className="mt-1 text-muted">{t('subtitle')}</p>
        </div>
        <Link href={resumeHref}>
          <Button size="lg">
            <CirclePlay size={18} />
            {t('resumeLearning')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          tone="primary"
          value={stats.coursesInProgress}
          label={t('coursesInProgress')}
        />
        <StatCard
          icon={CircleCheck}
          tone="emerald"
          value={stats.coursesCompleted}
          label={t('coursesCompleted')}
        />
        <StatCard
          icon={Award}
          tone="violet"
          value={stats.certificates}
          label={t('certificatesEarned')}
        />
        <StatCard
          icon={Clock}
          tone="amber"
          value={`${stats.learningHours}h`}
          label={t('learningHours')}
        />
      </div>

      {/* Managers/admins only. Rendered above the learner sections and outside the
          `nothingStarted` branch — a manager who follows no course of their own
          must still see what they assigned to their team. */}
      {team && team.counts.total > 0 && <TeamSection team={team} />}

      {isPending ? (
        <LoadingState label={tc('loading')} />
      ) : nothingStarted ? (
        <EmptyState
          icon={BookOpen}
          title={t('startTitle')}
          description={t('startHint')}
          action={
            <Link href="/catalog">
              <Button>{t('browseCatalog')}</Button>
            </Link>
          }
        />
      ) : (
        <>
          {continueLearning.length > 0 && (
            <Section icon={CirclePlay} title={t('continueLearning')} seeAllHref="/my-learning" seeAllLabel={t('seeAll')}>
              <div className="grid gap-4 sm:grid-cols-2">
                {continueLearning.map((e) => (
                  <EnrollmentCard key={e.id} enrollment={e} />
                ))}
              </div>
            </Section>
          )}

          {assigned.length > 0 && (
            <Section icon={ClipboardList} title={t('assignedTitle')} lead={t('assignedLead')}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assigned.map((a) => (
                  <AssignedCard key={a.course.id} item={a} />
                ))}
              </div>
            </Section>
          )}

          {mandatory.length > 0 && (
            <Section
              icon={Star}
              title={t('mandatoryTitle')}
              lead={t('mandatoryLead', { count: stats.mandatoryRemaining })}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mandatory.map((m) => (
                  <MandatoryCard key={m.course.id} item={m} />
                ))}
              </div>
            </Section>
          )}

          {recommendations.length > 0 && (
            <Section icon={Sparkles} title={t('recommendedTitle')} lead={t('recommendedLead')}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((course) => (
                  <CourseCard key={course.id} course={course} view="grid" />
                ))}
              </div>
            </Section>
          )}

          {certificates.length > 0 && (
            <Section
              icon={Award}
              title={t('certificatesTitle')}
              seeAllHref="/certificates"
              seeAllLabel={t('seeAll')}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <CertificateRow key={cert.id} cert={cert} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  lead,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  icon: typeof CirclePlay;
  title: string;
  lead?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Icon size={18} className="text-primary" />
            {title}
          </h3>
          {lead && <p className="mt-0.5 text-sm text-muted">{lead}</p>}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-semibold text-primary hover:text-primary-700"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function TeamSection({ team }: { team: TeamOverview }) {
  const t = useTranslations('dashboard');
  const { counts, assignments } = team;

  return (
    <Section
      icon={Users}
      title={t('teamTitle')}
      lead={t('teamLead', { count: counts.total })}
      seeAllHref="/admin/reports"
      seeAllLabel={t('teamSeeAll')}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TeamCount label={t('teamNotStarted')} value={counts.notStarted} />
          <TeamCount label={t('teamInProgress')} value={counts.inProgress} />
          <TeamCount label={t('teamCompleted')} value={counts.completed} />
          <TeamCount label={t('teamOverdue')} value={counts.overdue} alert={counts.overdue > 0} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <TeamAssignmentCard key={a.id} item={a} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function TeamCount({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card className={alert ? 'border-rose-200 bg-rose-50' : undefined}>
      <CardBody className="py-3">
        <p className={cn('text-2xl font-extrabold tabular-nums', alert ? 'text-rose-700' : 'text-ink')}>
          {value}
        </p>
        <p className={cn('text-xs font-semibold', alert ? 'text-rose-600' : 'text-muted')}>{label}</p>
      </CardBody>
    </Card>
  );
}

function TeamAssignmentCard({ item }: { item: TeamAssignment }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { userName, course, status, progress, dueDate, overdue } = item;
  const statusLabel = {
    not_started: t('teamStatusNotStarted'),
    in_progress: t('teamStatusInProgress'),
    completed: t('teamStatusCompleted'),
  }[status];
  // dueDate is date-only ('YYYY-MM-DD') — anchor to local midnight so it doesn't
  // render a day early west of UTC (same rule as AssignedCard).
  const due = dueDate
    ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const statusTone = status === 'completed' ? 'success' : status === 'in_progress' ? 'primary' : 'neutral';

  return (
    <Card className={cn('border-s-4', overdue ? 'border-s-rose-400' : 'border-s-slate-200')}>
      <CardBody className="flex h-full flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          {overdue ? (
            <Badge tone="danger">{t('teamOverdueBadge', { date: due ?? '' })}</Badge>
          ) : (
            due && <Badge tone="warning">{t('dueOn', { date: due })}</Badge>
          )}
        </div>
        <p className="font-bold text-ink">{userName}</p>
        <p className="line-clamp-2 text-sm text-muted">{course.title}</p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted">{progress}%</span>
        </div>
      </CardBody>
    </Card>
  );
}

function MandatoryCard({ item }: { item: MandatoryItem }) {
  const t = useTranslations('dashboard');
  const tl = useTranslations('levels');
  const { course, status, progress, enrolled } = item;
  const href = enrolled ? `/learn/${course.slug}` : `/catalog/${course.slug}`;
  const cta = status === 'not_started' ? t('start') : t('resume');

  return (
    <Card className="border-s-4 border-s-rose-400">
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={accentTone(course.categoryAccent)}>{course.categoryName ?? t('mandatoryTitle')}</Badge>
          <Badge tone={levelTone(course.level)}>{tl(course.level)}</Badge>
        </div>
        <h4 className="font-bold text-ink">{course.title}</h4>
        <p className="line-clamp-2 text-sm text-muted">{course.summary}</p>
        <div className="mt-auto space-y-2 pt-2">
          {enrolled && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${progress}%` }} />
            </div>
          )}
          <Link href={href} className="block">
            <Button size="sm" className="w-full">
              {cta}
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function AssignedCard({ item }: { item: AssignedItem }) {
  const t = useTranslations('dashboard');
  const tl = useTranslations('levels');
  const locale = useLocale();
  const { course, status, progress, enrolled, dueDate, assignedBy } = item;
  const href = enrolled ? `/learn/${course.slug}` : `/catalog/${course.slug}`;
  const cta = status === 'not_started' ? t('start') : t('resume');
  // dueDate is a date-only string ('YYYY-MM-DD'); anchor it to local midnight so
  // it doesn't render a day early for viewers west of UTC.
  const due = dueDate
    ? new Date(`${dueDate}T00:00:00`).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card className="border-s-4 border-s-primary-400">
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={accentTone(course.categoryAccent)}>{course.categoryName ?? t('assignedTitle')}</Badge>
          <Badge tone={levelTone(course.level)}>{tl(course.level)}</Badge>
          {due && <Badge tone="warning">{t('dueOn', { date: due })}</Badge>}
        </div>
        <h4 className="font-bold text-ink">{course.title}</h4>
        <p className="line-clamp-2 text-sm text-muted">{course.summary}</p>
        {assignedBy && <p className="text-xs text-muted">{t('assignedByLabel', { name: assignedBy })}</p>}
        <div className="mt-auto space-y-2 pt-2">
          {enrolled && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${progress}%` }} />
            </div>
          )}
          <Link href={href} className="block">
            <Button size="sm" className="w-full">
              {cta}
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function CertificateRow({ cert }: { cert: Certificate }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const issued = new Date(cert.issuedAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return (
    <Link href="/certificates" className="block">
      <Card className="transition-shadow hover:shadow-card-hover">
        <CardBody className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Award size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{cert.courseTitle}</p>
            <p className="text-xs text-muted">{t('issuedOn', { date: issued })}</p>
          </div>
          {cert.isValid && <ShieldCheck size={16} className="shrink-0 text-emerald-500" />}
        </CardBody>
      </Card>
    </Link>
  );
}
