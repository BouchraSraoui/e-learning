'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, List, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { CourseCard } from '@/components/catalog/course-card';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useCourses } from '@/hooks/use-courses';
import { useCategories } from '@/hooks/use-reference';
import { cn } from '@/lib/utils';
import type { ContentType, CourseFilters, CourseLevel, DurationBucket } from '@/types';

const PAGE_SIZE = 12;
const DEFAULT_ORDER = '-created_at';
const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const FORMATS: ContentType[] = ['video', 'audio', 'pdf', 'slides', 'text'];
const DURATIONS: DurationBucket[] = ['short', 'medium', 'long'];

export default function CatalogPage() {
  const t = useTranslations('catalog');
  const tc = useTranslations('common');
  const tl = useTranslations('levels');
  const tf = useTranslations('formats');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [contentType, setContentType] = useState('');
  const [duration, setDuration] = useState('');
  const [ordering, setOrdering] = useState(DEFAULT_ORDER);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);

  const { data: categories } = useCategories();

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, category, level, contentType, duration, ordering]);

  const filters: CourseFilters = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      level: (level as CourseLevel) || undefined,
      contentType: (contentType as ContentType) || undefined,
      duration: (duration as DurationBucket) || undefined,
      ordering,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, category, level, contentType, duration, ordering, page],
  );

  const { data, isPending, isError, refetch, isFetching } = useCourses(filters);

  const hasFilters =
    Boolean(search || category || level || contentType || duration) || ordering !== DEFAULT_ORDER;

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setLevel('');
    setContentType('');
    setDuration('');
    setOrdering(DEFAULT_ORDER);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('heading')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="h-11 w-full rounded-xl border border-line bg-slate-50 ps-11 pe-4 text-sm placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[9rem] flex-1">
              <Select
                label={t('category')}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: '', label: t('allCategories') },
                  ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <div className="min-w-[8rem] flex-1">
              <Select
                label={t('level')}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                options={[
                  { value: '', label: t('allLevels') },
                  ...LEVELS.map((l) => ({ value: l, label: tl(l) })),
                ]}
              />
            </div>
            <div className="min-w-[8rem] flex-1">
              <Select
                label={t('format')}
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                options={[
                  { value: '', label: t('allFormats') },
                  ...FORMATS.map((f) => ({ value: f, label: tf(f) })),
                ]}
              />
            </div>
            <div className="min-w-[8rem] flex-1">
              <Select
                label={t('duration')}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                options={[
                  { value: '', label: t('anyDuration') },
                  ...DURATIONS.map((d) => ({ value: d, label: t(`duration${d[0].toUpperCase()}${d.slice(1)}`) })),
                ]}
              />
            </div>
            <div className="min-w-[9rem] flex-1">
              <Select
                label={t('sortBy')}
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                options={[
                  { value: '-created_at', label: t('sortNewest') },
                  { value: 'title', label: t('sortTitle') },
                  { value: 'duration_minutes', label: t('sortShortest') },
                  { value: '-duration_minutes', label: t('sortLongest') },
                ]}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {data ? t('resultsCount', { count: data.count }) : ' '}
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={16} />
              {t('clearFilters')}
            </Button>
          )}
          <div className="flex rounded-lg border border-line p-0.5">
            <ViewButton active={view === 'grid'} onClick={() => setView('grid')} label={t('gridView')}>
              <LayoutGrid size={18} />
            </ViewButton>
            <ViewButton active={view === 'list'} onClick={() => setView('list')} label={t('listView')}>
              <List size={18} />
            </ViewButton>
          </div>
        </div>
      </div>

      {isPending ? (
        <LoadingState label={t('heading')} />
      ) : isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} />
      ) : data.results.length === 0 ? (
        <EmptyState icon={Search} title={t('noResultsTitle')} description={t('noResultsHint')} />
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <div
            className={
              view === 'grid'
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            }
          >
            {data.results.map((course) => (
              <CourseCard key={course.id} course={course} view={view} />
            ))}
          </div>

          {data.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} className="rtl:rotate-180" />
                {tc('back')}
              </Button>
              <span className="text-sm text-muted">
                {page} / {data.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              >
                {tc('next')}
                <ChevronRight size={16} className="rtl:rotate-180" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-md transition-colors',
        active ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}
