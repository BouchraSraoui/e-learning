'use client';

import { Award, BookOpen, Clock, GraduationCap, Lock, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useNetworkMode } from '@/context/network-mode-context';
import { accentGradient, accentTone, CONTENT_TYPE_ICON, levelTone } from '@/lib/catalog';
import { cn, formatDuration } from '@/lib/utils';
import type { CourseSummary } from '@/types';

function Thumb({ course, className }: { course: CourseSummary; className?: string }) {
  const FormatIcon = CONTENT_TYPE_ICON[course.primaryFormat];
  if (course.thumbnailUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={course.thumbnailUrl} alt="" className={cn('object-cover', className)} />;
  }
  return (
    <div
      className={cn(
        'grid place-items-center bg-gradient-to-br text-white/90',
        accentGradient(course.categoryAccent),
        className,
      )}
    >
      <FormatIcon size={34} strokeWidth={1.5} />
    </div>
  );
}

function MetaRow({ course }: { course: CourseSummary }) {
  const tc = useTranslations('catalog');
  const tf = useTranslations('formats');
  const FormatIcon = CONTENT_TYPE_ICON[course.primaryFormat];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1">
        <Clock size={14} />
        {formatDuration(course.durationMinutes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <BookOpen size={14} />
        {tc('lessonsCount', { count: course.lessonCount })}
      </span>
      <span className="inline-flex items-center gap-1">
        <FormatIcon size={14} />
        {tf(course.primaryFormat)}
      </span>
    </div>
  );
}

export function CourseCard({ course, view }: { course: CourseSummary; view: 'grid' | 'list' }) {
  const t = useTranslations('catalog');
  const tl = useTranslations('levels');
  const { onNet } = useNetworkMode();

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      {course.internalOnly && !onNet && (
        <Badge tone="warning">
          <Lock size={12} />
          {t('internalOnly')}
        </Badge>
      )}
      {course.categoryName && <Badge tone={accentTone(course.categoryAccent)}>{course.categoryName}</Badge>}
      <Badge tone={levelTone(course.level)}>
        <GraduationCap size={12} />
        {tl(course.level)}
      </Badge>
      {course.mandatory && (
        <Badge tone="danger">
          <Star size={12} />
          {t('mandatory')}
        </Badge>
      )}
      {course.issuesCertificate === false && (
        <Badge tone="neutral">
          <Award size={12} />
          {t('noCertificate')}
        </Badge>
      )}
    </div>
  );

  if (view === 'list') {
    return (
      <Link
        href={`/catalog/${course.slug}`}
        className="group flex gap-4 rounded-2xl border border-line bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover"
      >
        <Thumb course={course} className="h-24 w-32 shrink-0 rounded-xl sm:h-28 sm:w-44" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          {badges}
          <h3 className="line-clamp-1 font-bold text-ink group-hover:text-primary">{course.title}</h3>
          <p className="line-clamp-2 text-sm text-muted">{course.summary}</p>
          <MetaRow course={course} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/catalog/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-card-hover"
    >
      <Thumb course={course} className="h-36 w-full" />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {badges}
        <h3 className="line-clamp-2 font-bold text-ink group-hover:text-primary">{course.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted">{course.summary}</p>
        <MetaRow course={course} />
      </div>
    </Link>
  );
}
