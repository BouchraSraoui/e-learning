'use client';

import {
  Award,
  FileText,
  Headphones,
  LibraryBig,
  ListChecks,
  Network,
  Route,
  Search,
  ShieldCheck,
  TrendingUp,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CONTENT_TYPE_ICON } from '@/lib/catalog';
import { useLandingPreview } from '@/hooks/use-courses';
import { cn } from '@/lib/utils';
import type { Accent, ContentType } from '@/types';

const ACCENT_STYLES: Record<Accent, { tile: string; eyebrow: string }> = {
  primary: { tile: 'bg-primary-50 text-primary', eyebrow: 'text-primary' },
  brand: { tile: 'bg-brand-50 text-brand-600', eyebrow: 'text-brand-600' },
  violet: { tile: 'bg-violet-50 text-violet-600', eyebrow: 'text-violet-600' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600', eyebrow: 'text-emerald-600' },
  amber: { tile: 'bg-amber-50 text-amber-600', eyebrow: 'text-amber-600' },
  rose: { tile: 'bg-rose-50 text-rose-500', eyebrow: 'text-rose-500' },
};

type Row = {
  key: string;
  category: string | null;
  title: string;
  Icon: LucideIcon;
  tile: string;
  eyebrow: string;
  formats: { Icon: LucideIcon; label: string }[];
};

// Decorative glimpse of the course library — real catalog data when available,
// a generic mock only while the library is empty. Markup is the final state;
// the mount cascade is pure CSS (`rise-*`, fill-mode backwards), so
// no-JS/reduced-motion always render it settled.
export function HeroPreview() {
  const t = useTranslations('landing');
  const tf = useTranslations('formats');
  const { data, isPending } = useLandingPreview();

  const hasReal = Boolean(data && data.courses.length > 0);

  const formatChip = (type: ContentType) => ({
    Icon: CONTENT_TYPE_ICON[type] ?? FileText,
    label: tf(type),
  });

  const fallbackChips = [
    t('preview.chipCommercial'),
    t('preview.chipHr'),
    t('preview.chipTechnical'),
    t('preview.chipCompliance'),
  ];
  const chips = hasReal && data ? data.categories : fallbackChips;

  const fallbackRows: Row[] = [
    {
      key: 'f1',
      category: t('preview.course1Category'),
      title: t('preview.course1'),
      Icon: TrendingUp,
      ...ACCENT_STYLES.primary,
      formats: [
        { Icon: Video, label: t('preview.formatVideo') },
        { Icon: ListChecks, label: t('preview.formatQuiz') },
      ],
    },
    {
      key: 'f2',
      category: t('preview.course2Category'),
      title: t('preview.course2'),
      Icon: Network,
      ...ACCENT_STYLES.emerald,
      formats: [
        { Icon: Video, label: t('preview.formatVideo') },
        { Icon: FileText, label: t('preview.formatPdf') },
      ],
    },
    {
      key: 'f3',
      category: t('preview.course3Category'),
      title: t('preview.course3'),
      Icon: ShieldCheck,
      ...ACCENT_STYLES.amber,
      formats: [
        { Icon: FileText, label: t('preview.formatPdf') },
        { Icon: Headphones, label: t('preview.formatAudio') },
        { Icon: ListChecks, label: t('preview.formatQuiz') },
      ],
    },
  ];

  const rows: Row[] =
    hasReal && data
      ? data.courses.map((course, i) => {
          const accent = ACCENT_STYLES[course.accent] ?? ACCENT_STYLES.primary;
          return {
            key: `${course.title}-${i}`,
            category: course.category,
            title: course.title,
            Icon: course.formats[0] ? (CONTENT_TYPE_ICON[course.formats[0]] ?? LibraryBig) : LibraryBig,
            ...accent,
            formats: course.formats.map(formatChip),
          };
        })
      : fallbackRows;

  // Real library but no published path → drop the footer rather than invent one.
  const pathName = hasReal && data ? data.path : t('preview.pathName');

  return (
    <div className="relative" aria-hidden>
      <div className="pointer-events-none absolute -end-8 -top-10 h-64 w-64 rounded-full bg-brand-gradient opacity-[0.12] blur-3xl motion-safe:animate-blob-drift" />

      <div className="relative rounded-3xl border border-line bg-white p-5 shadow-pop sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
              <LibraryBig size={16} />
            </span>
            <span className="text-sm font-bold text-ink">{t('preview.libraryTitle')}</span>
          </span>
          {/* Decorative search pill — intentionally not an input, no hover/focus. */}
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-slate-50 px-3">
            <Search size={14} className="text-muted" />
            <span className="text-xs text-muted">{t('preview.searchHint')}</span>
          </span>
        </div>

        {isPending ? (
          <PreviewSkeleton />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex h-7 items-center rounded-full bg-primary px-3 text-xs font-semibold text-white motion-safe:animate-rise-6"
                style={{ animationDelay: '0ms' }}
              >
                {t('preview.chipAll')}
              </span>
              {chips.map((chip, i) => (
                <span
                  key={chip}
                  className="inline-flex h-7 items-center rounded-full border border-line bg-slate-50 px-3 text-xs font-semibold text-muted motion-safe:animate-rise-6"
                  style={{ animationDelay: `${(i + 1) * 50}ms` }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {rows.map(({ key, category, title, Icon, tile, eyebrow, formats }, i) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 motion-safe:animate-rise-8"
                  style={{ animationDelay: `${240 + i * 120}ms` }}
                >
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tile)}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {category && (
                      <p className={cn('text-[10px] font-bold uppercase tracking-wide', eyebrow)}>{category}</p>
                    )}
                    <p className="truncate text-sm font-semibold text-ink">{title}</p>
                    {formats.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {formats.map((f) => (
                          <span
                            key={f.label}
                            className="inline-flex h-5 items-center gap-1 rounded-md border border-line bg-white px-1.5 text-[10px] font-medium text-muted"
                          >
                            <f.Icon size={11} />
                            {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pathName && (
              <div
                className="mt-4 flex items-center gap-3 rounded-xl bg-primary-50 p-3 motion-safe:animate-rise-8"
                style={{ animationDelay: '620ms' }}
              >
                <Route size={16} className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{t('preview.pathLabel')}</p>
                  <p className="truncate text-sm font-semibold text-ink">{pathName}</p>
                </div>
                <span
                  className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-white px-2 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-600/10 motion-safe:animate-rise-4"
                  style={{ animationDelay: '780ms' }}
                >
                  <Award size={12} />
                  {t('preview.certificate')}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Mirrors the loaded layout so the card doesn't jump when data lands.
function PreviewSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-4 flex flex-wrap gap-2">
        {[10, 20, 12, 16, 20].map((w, i) => (
          <span key={i} className="h-7 rounded-full bg-slate-100" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2 w-16 rounded bg-slate-100" />
              <div className="h-3 w-40 rounded bg-slate-100" />
              <div className="h-4 w-24 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-[60px] rounded-xl bg-primary-50/60" />
    </div>
  );
}
