'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Download, FileText, Plus, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { AssignCourseModal } from '@/components/admin/assign-course-modal';
import { RoleGuard } from '@/components/app/role-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useAssignments, useDeleteAssignment, useReport } from '@/hooks/use-management';
import { useDepartments } from '@/hooks/use-reference';
import { downloadFile } from '@/lib/download';
import { services } from '@/services';
import type { EnrollmentStatus, ReportFilters } from '@/types';

const STATUS_TONE: Record<EnrollmentStatus, 'neutral' | 'warning' | 'success'> = {
  not_started: 'neutral',
  in_progress: 'warning',
  completed: 'success',
};

function useStatusLabel() {
  const t = useTranslations('reports');
  return (s: EnrollmentStatus) =>
    t(s === 'completed' ? 'statusCompleted' : s === 'in_progress' ? 'statusInProgress' : 'statusNotStarted');
}


function ReportsTab() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const toast = useToast();
  const statusLabel = useStatusLabel();
  const { data: departments } = useDepartments();
  const { data: courses } = useQuery({
    queryKey: ['assignable-courses'],
    queryFn: () => services.courses.list({ pageSize: 100, ordering: 'title' }),
  });

  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');

  const filters: ReportFilters = useMemo(
    () => ({
      department: department || undefined,
      course: course || undefined,
      status: (status || undefined) as EnrollmentStatus | undefined,
    }),
    [department, course, status],
  );

  const { data, isPending, isError, refetch } = useReport(filters);

  async function onExport(fmt: 'csv' | 'xlsx' | 'pdf') {
    try {
      downloadFile(await services.management.exportReport(fmt, filters));
    } catch {
      toast.error(t('exportFailed'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          aria-label={t('filterDepartment')}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          options={[
            { value: '', label: t('allDepartments') },
            ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <Select
          aria-label={t('filterCourse')}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          options={[
            { value: '', label: t('allCourses') },
            ...(courses?.results ?? []).map((c) => ({ value: c.slug, label: c.title })),
          ]}
        />
        <Select
          aria-label={t('filterStatus')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: t('allStatuses') },
            { value: 'not_started', label: t('statusNotStarted') },
            { value: 'in_progress', label: t('statusInProgress') },
            { value: 'completed', label: t('statusCompleted') },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{t('rowsCount', { count: data?.count ?? 0 })}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onExport('csv')}>
            <Download size={16} />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onExport('xlsx')}>
            <Download size={16} />
            XLSX
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onExport('pdf')}>
            <FileText size={16} />
            PDF
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : (data?.rows.length ?? 0) === 0 ? (
        <EmptyState icon={ClipboardList} title={t('noRows')} description={t('noRowsHint')} />
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          <Table>
            <THead className="border-b border-line">
              <Tr className="hover:bg-transparent">
                <Th>{t('colLearner')}</Th>
                <Th>{t('colDepartment')}</Th>
                <Th>{t('colCourse')}</Th>
                <Th>{t('colStatus')}</Th>
                <Th>{t('colProgress')}</Th>
                <Th>{t('colCompleted')}</Th>
              </Tr>
            </THead>
            <TBody>
              {data!.rows.map((r, i) => (
                <Tr key={`${r.userEmail}-${r.courseSlug}-${i}`}>
                  <Td>
                    <p className="font-medium text-ink">{r.userName}</p>
                    <p className="text-xs text-muted">{r.userEmail}</p>
                  </Td>
                  <Td className="text-slate-600">{r.department || '—'}</Td>
                  <Td className="text-slate-700">{r.courseTitle}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{statusLabel(r.status)}</Badge>
                  </Td>
                  <Td className="tabular-nums text-slate-600">{r.progress}%</Td>
                  <Td className="text-slate-600">{r.completedAt || '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}


function AssignmentsTab() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const toast = useToast();
  const statusLabel = useStatusLabel();
  const { data, isPending, isError, refetch } = useAssignments();
  const deleteAssignment = useDeleteAssignment();
  const [assignOpen, setAssignOpen] = useState(false);

  async function onDelete(id: string) {
    try {
      await deleteAssignment.mutateAsync(id);
      toast.success(t('assignmentDeleted'));
    } catch {
      toast.error(tc('retry'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          <Plus size={16} />
          {t('assignCourse')}
        </Button>
      </div>

      {isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title={t('noAssignments')} description={t('noAssignmentsHint')} />
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          <Table>
            <THead className="border-b border-line">
              <Tr className="hover:bg-transparent">
                <Th>{t('colLearner')}</Th>
                <Th>{t('colCourse')}</Th>
                <Th>{t('due')}</Th>
                <Th>{t('colStatus')}</Th>
                <Th className="text-end">{t('colActions')}</Th>
              </Tr>
            </THead>
            <TBody>
              {data!.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <p className="font-medium text-ink">{a.userName}</p>
                    <p className="text-xs text-muted">{a.userEmail}</p>
                  </Td>
                  <Td className="text-slate-700">{a.course.title}</Td>
                  <Td className="text-slate-600">{a.dueDate || '—'}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[a.status]}>{statusLabel(a.status)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <button
                        onClick={() => onDelete(a.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={tc('delete')}
                        title={t('removeAssignment')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <AssignCourseModal open={assignOpen} onClose={() => setAssignOpen(false)} />
    </div>
  );
}


function ReportsInner() {
  const t = useTranslations('reports');
  const [tab, setTab] = useState<'reports' | 'assignments'>('reports');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        tabs={[
          { value: 'reports', label: t('tabReports') },
          { value: 'assignments', label: t('tabAssignments') },
        ]}
      />

      {tab === 'reports' && <ReportsTab />}
      {tab === 'assignments' && <AssignmentsTab />}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <RoleGuard roles={['admin', 'manager']}>
      <ReportsInner />
    </RoleGuard>
  );
}
