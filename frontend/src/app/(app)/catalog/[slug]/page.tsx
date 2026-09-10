'use client';

import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  Clock,
  Download,
  GraduationCap,
  Layers,
  Lock,
  Play,
  Star,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { CommentThread } from '@/components/engagement/comment-thread';
import { CourseFeedback } from '@/components/engagement/course-feedback';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useNetworkMode } from '@/context/network-mode-context';
import { useToast } from '@/components/ui/toast';
import { useEnroll, useEnrollment } from '@/hooks/use-enrollment';
import { useCourse } from '@/hooks/use-courses';
import { accentTone, CONTENT_TYPE_ICON, levelTone } from '@/lib/catalog';
import { cn, formatDuration } from '@/lib/utils';
import type { CourseDetail, Lesson, Module } from '@/types';

function isNotFound(err: unknown): boolean {
  const e = err as { code?: string; response?: { status?: number } } | null;
  return !e || e.code === 'not_found' || e.response?.status === 404;
}

export default function CourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const t = useTranslations('courseDetail');
  const ts = useTranslations('states');
  const tc = useTranslations('common');
  const { data: course, isPending, error, refetch } = useCourse(slug);

  if (isPending) return <LoadingState label={tc('loading')} />;
  if (!course) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isNotFound(error) ? (
          <EmptyState icon={Lock} title={t('notFoundTitle')} description={t('notFoundHint')} />
        ) : (
          <ErrorState
            title={ts('errorTitle')}
            description={ts('errorSubtitle')}
            onRetry={() => refetch()}
            retryLabel={tc('retry')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <Header course={course} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {course.description && <About html={course.description} />}
          {course.objectives.length > 0 && <Objectives items={course.objectives} />}
          <Syllabus modules={course.modules} />
          <Discussion slug={course.slug} />
        </div>

        <aside className="space-y-6">
          <InfoCard course={course} />
          <Reviews slug={course.slug} />
          {course.prerequisites.length > 0 && <Prerequisites course={course} />}
          {course.resources.length > 0 && <Resources course={course} />}
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  const t = useTranslations('courseDetail');
  return (
    <Link
      href="/catalog"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
    >
      <ArrowLeft size={16} className="rtl:rotate-180" />
      {t('backToCatalog')}
    </Link>
  );
}

function Header({ course }: { course: CourseDetail }) {
  const t = useTranslations('courseDetail');
  const tl = useTranslations('levels');
  const tLearn = useTranslations('learn');
  const toast = useToast();
  const router = useRouter();
  const { data: enrollment } = useEnrollment(course.slug);
  const enroll = useEnroll();
  const enrolled = Boolean(enrollment);
  const { onNet } = useNetworkMode();
  const internalLocked = course.internalOnly && !onNet;

  const onEnroll = async () => {
    try {
      await enroll.mutateAsync(course.slug);
      router.push(`/learn/${course.slug}`);
    } catch {
      toast.error(t('enrollError'));
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-auth-panel p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {course.categoryName && (
            <Badge tone={accentTone(course.categoryAccent)}>{course.categoryName}</Badge>
          )}
          <Badge tone={levelTone(course.level)}>
            <GraduationCap size={12} />
            {tl(course.level)}
          </Badge>
          {course.mandatory && (
            <Badge tone="danger">
              <Star size={12} />
              {t('mandatoryBadge')}
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">{course.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} />
            {formatDuration(course.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers size={15} />
            {t('chaptersLessons', { modules: course.moduleCount, lessons: course.lessonCount })}
          </span>
          {course.authorName && <span>{t('by', { name: course.authorName })}</span>}
        </div>

        {enrollment && (
          <div className="mt-5 max-w-xl">
            <p className="text-xs font-semibold text-white/85">
              {tLearn('percentComplete', { percent: enrollment.progress })}
            </p>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all duration-500"
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5">
          {internalLocked ? (
            <div className="inline-flex items-start gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white/90">
              <Lock size={16} className="mt-0.5 shrink-0" />
              <span>{t('internalLocked')}</span>
            </div>
          ) : enrolled ? (
            <Link href={`/learn/${course.slug}`}>
              <Button size="lg">
                <Play size={18} />
                {t('continueLearning')}
              </Button>
            </Link>
          ) : (
            <Button size="lg" onClick={onEnroll} loading={enroll.isPending}>
              <Play size={18} />
              {t('enroll')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function About({ html }: { html: string }) {
  const t = useTranslations('courseDetail');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-lg font-bold text-ink">{t('about')}</h2>
        <div
          className="space-y-3 text-sm leading-relaxed text-slate-600 [&_a]:text-primary [&_a]:underline [&_li]:ms-4 [&_li]:list-disc [&_strong]:text-ink"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardBody>
    </Card>
  );
}

function Objectives({ items }: { items: string[] }) {
  const t = useTranslations('courseDetail');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-lg font-bold text-ink">{t('objectives')}</h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Check size={13} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function Syllabus({ modules }: { modules: Module[] }) {
  const t = useTranslations('courseDetail');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 text-lg font-bold text-ink">{t('syllabus')}</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-muted">{t('emptySyllabus')}</p>
        ) : (
          <div className="space-y-4">
            {modules.map((module, i) => (
              <div key={module.id} className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">
                  <h3 className="text-sm font-bold text-ink">
                    <span className="text-muted">{i + 1}. </span>
                    {module.title}
                  </h3>
                  <span className="shrink-0 text-xs text-muted">
                    {t('lessonsCount', { count: module.lessonCount })}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {module.lessons.map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const t = useTranslations('courseDetail');
  const Icon = CONTENT_TYPE_ICON[lesson.type];
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{lesson.title}</span>
      {lesson.isPreview ? (
        <Badge tone="primary">{t('preview')}</Badge>
      ) : (
        <Lock size={14} className="shrink-0 text-slate-300" />
      )}
      <span className="shrink-0 text-xs text-muted">{formatDuration(lesson.durationMinutes)}</span>
    </li>
  );
}

function InfoCard({ course }: { course: CourseDetail }) {
  const t = useTranslations('courseDetail');
  const tl = useTranslations('levels');
  const tf = useTranslations('formats');
  const FormatIcon = CONTENT_TYPE_ICON[course.primaryFormat];

  return (
    <Card>
      <CardBody className="space-y-3">
        <InfoLine icon={GraduationCap} label={t('level')} value={tl(course.level)} />
        <InfoLine icon={Clock} label={t('duration')} value={formatDuration(course.durationMinutes)} />
        <InfoLine icon={FormatIcon} label={t('format')} value={tf(course.primaryFormat)} />
        <InfoLine icon={BookOpen} label={t('syllabus')} value={t('lessonsCount', { count: course.lessonCount })} />
        <InfoLine
          icon={Award}
          label={t('certificate')}
          value={course.issuesCertificate === false ? t('noCertificate') : t('certificateIncluded')}
        />
      </CardBody>
    </Card>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function Prerequisites({ course }: { course: CourseDetail }) {
  const t = useTranslations('courseDetail');
  const tl = useTranslations('levels');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-base font-bold text-ink">{t('prerequisites')}</h2>
        <ul className="space-y-2">
          {course.prerequisites.map((p) => (
            <li key={p.id}>
              <Link
                href={`/catalog/${p.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:border-primary-300 hover:bg-primary-50/40"
              >
                <span className="min-w-0 truncate font-medium text-ink">{p.title}</span>
                <Badge tone={levelTone(p.level)}>{tl(p.level)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function Discussion({ slug }: { slug: string }) {
  const t = useTranslations('comments');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 text-lg font-bold text-ink">{t('title')}</h2>
        <CommentThread courseSlug={slug} />
      </CardBody>
    </Card>
  );
}

function Reviews({ slug }: { slug: string }) {
  const t = useTranslations('feedback');
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-base font-bold text-ink">{t('title')}</h2>
        <CourseFeedback courseSlug={slug} />
      </CardBody>
    </Card>
  );
}

function Resources({ course }: { course: CourseDetail }) {
  const t = useTranslations('courseDetail');
  const { onNet } = useNetworkMode();
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 text-base font-bold text-ink">{t('resources')}</h2>
        <ul className="space-y-2">
          {course.resources.map((r) => {
            // Downloadable course-material files are on-net only; external links stay.
            const blocked = Boolean(r.fileUrl) && !onNet;
            const href = blocked ? null : r.fileUrl || r.externalUrl;
            const row = (
              <span
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm',
                  href && 'hover:border-primary-300 hover:bg-primary-50/40',
                  blocked && 'opacity-70',
                )}
              >
                {blocked ? (
                  <Lock size={16} className="shrink-0 text-amber-500" />
                ) : (
                  <Download size={16} className="shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 truncate font-medium text-ink">{r.title}</span>
                {blocked && (
                  <span className="ms-auto shrink-0 text-xs font-medium text-amber-600">
                    {t('onNetOnly')}
                  </span>
                )}
              </span>
            );
            return (
              <li key={r.id}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {row}
                  </a>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
