'use client';

import { BookMarked, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/app/role-guard';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminCourses, useDeleteCourse, useUpdateCourse } from '@/hooks/use-authoring';
import type { CourseFilters, CourseLevel, CourseSummary } from '@/types';

const PAGE_SIZE = 20;

function AdminCoursesInner() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tLevels = useTranslations('levels');
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const mine = user?.role === 'manager';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<CourseSummary | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => setPage(1), [debounced, level, status]);

  const filters: CourseFilters = useMemo(
    () => ({
      search: debounced || undefined,
      level: (level || undefined) as CourseLevel | undefined,
      ordering: '-created_at',
      page,
      pageSize: PAGE_SIZE,
      mine: mine || undefined,
    }),
    [debounced, level, page, mine],
  );

  const { data, isPending, isError, refetch } = useAdminCourses(filters);
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const rows = useMemo(() => {
    const list = data?.results ?? [];
    if (status === 'published') return list.filter((c) => c.published);
    if (status === 'draft') return list.filter((c) => !c.published);
    return list;
  }, [data, status]);

  async function togglePublish(c: CourseSummary) {
    try {
      await updateCourse.mutateAsync({ slug: c.slug, input: { published: !c.published } });
      toast.success(c.published ? t('courseUnpublished') : t('coursePublished'));
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCourse.mutateAsync(deleting.slug);
      toast.success(t('courseDeleted'));
      setDeleting(null);
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  const total = data?.count ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('coursesTitle')}</h2>
          <p className="mt-1 text-muted">{t('coursesSubtitle')}</p>
        </div>
        <Button size="sm" onClick={() => router.push('/admin/courses/new')}>
          <Plus size={16} />
          {t('newCourse')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCourses')}
            className="h-11 w-full rounded-xl border border-line bg-white ps-10 pe-3.5 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <Select
          aria-label={t('level')}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          options={[
            { value: '', label: t('allLevels') },
            ...(['beginner', 'intermediate', 'advanced'] as CourseLevel[]).map((l) => ({
              value: l,
              label: tLevels(l),
            })),
          ]}
        />
        <Select
          aria-label={t('status')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: t('allStatuses') },
            { value: 'published', label: t('published') },
            { value: 'draft', label: t('draft') },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState title={t('loadErrorCourses')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title={t('noCourses')}
          description={t('noCoursesHint')}
          action={<Button onClick={() => router.push('/admin/courses/new')}>{t('newCourse')}</Button>}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          <Table>
            <THead className="border-b border-line">
              <Tr className="hover:bg-transparent">
                <Th>{t('courseTitle')}</Th>
                <Th>{t('level')}</Th>
                <Th>{t('structure')}</Th>
                <Th>{t('status')}</Th>
                <Th className="text-end">{t('colActions')}</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link
                      href={`/admin/courses/${c.slug}/edit`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {c.title}
                    </Link>
                    <p className="truncate text-xs text-muted">{c.categoryName ?? '—'}</p>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{tLevels(c.level)}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-600">
                    {t('structureCount', { modules: c.moduleCount, lessons: c.lessonCount })}
                  </Td>
                  <Td>
                    <Badge tone={c.published ? 'success' : 'warning'}>
                      {c.published ? t('published') : t('draft')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => togglePublish(c)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-primary"
                      >
                        {c.published ? t('unpublish') : t('publish')}
                      </button>
                      <Link
                        href={`/catalog/${c.slug}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                        aria-label={t('previewCourse')}
                        title={t('previewCourse')}
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/admin/courses/${c.slug}/edit`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                        aria-label={t('editBuilder')}
                        title={t('editBuilder')}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => setDeleting(c)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={tc('delete')}
                        title={tc('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <span>{t('coursesCount', { count: total })}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {tc('back')}
              </Button>
              <span className="tabular-nums">{t('pageOf', { page, pages })}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                {tc('next')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('deleteCourseTitle')}
        description={t('deleteCourseConfirm', { title: deleting?.title ?? '' })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {tc('cancel')}
            </Button>
            <Button variant="danger" loading={deleteCourse.isPending} onClick={confirmDelete}>
              {tc('delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('deleteCourseHint')}</p>
      </Modal>
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <RoleGuard roles={['admin', 'manager']}>
      <AdminCoursesInner />
    </RoleGuard>
  );
}
