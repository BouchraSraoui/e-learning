'use client';

import { Download, Pencil, Plus, Search, Trash2, Upload, UserCog, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/app/role-guard';
import { UserFormModal } from '@/components/admin/user-form-modal';
import { UserImportModal } from '@/components/admin/user-import-modal';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminUsers, useDeleteUser, useUpdateUser } from '@/hooks/use-admin-users';
import { useDepartments } from '@/hooks/use-reference';
import { downloadFile } from '@/lib/download';
import { services } from '@/services';
import type { AdminUserFilters, Role, User } from '@/types';

const PAGE_SIZE = 20;
const ROLE_TONE: Record<Role, 'primary' | 'violet' | 'warning'> = {
  user: 'primary',
  manager: 'violet',
  admin: 'warning',
};

function AdminUsersInner() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tRoles = useTranslations('roles');
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [active, setActive] = useState<string>('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => setPage(1), [debounced, role, department, active]);

  const filters: AdminUserFilters = useMemo(
    () => ({
      search: debounced || undefined,
      role: (role || undefined) as Role | undefined,
      department: department || undefined,
      active: active === '' ? undefined : active === 'true',
      page,
      pageSize: PAGE_SIZE,
    }),
    [debounced, role, department, active, page],
  );

  const { data, isPending, isError, refetch } = useAdminUsers(filters);
  const { data: departments } = useDepartments();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();

  const deptName = (id: string) => departments?.find((d) => d.id === id)?.name ?? '—';

  async function onExport(fmt: 'csv' | 'xlsx') {
    try {
      downloadFile(await services.users.exportUsers(fmt, filters));
    } catch {
      toast.error(t('exportFailed'));
    }
  }

  async function toggleActive(user: User) {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        input: {
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          active: !user.active,
        },
      });
      toast.success(user.active ? t('userDeactivated') : t('userActivated'));
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteUser.mutateAsync(deleting.id);
      toast.success(t('userDeleted'));
      setDeleting(null);
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('usersTitle')}</h2>
          <p className="mt-1 text-muted">{t('usersSubtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onExport('csv')}>
            <Download size={16} />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onExport('xlsx')}>
            <Download size={16} />
            XLSX
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={16} />
            {t('import')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            {t('newUser')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchUsers')}
            className="h-11 w-full rounded-xl border border-line bg-white ps-10 pe-3.5 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <Select
          aria-label={t('role')}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: '', label: t('allRoles') },
            ...(['user', 'manager', 'admin'] as Role[]).map((r) => ({
              value: r,
              label: tRoles(r),
            })),
          ]}
        />
        <Select
          aria-label={tc('department')}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          options={[
            { value: '', label: t('allDepartments') },
            ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <Select
          aria-label={t('status')}
          value={active}
          onChange={(e) => setActive(e.target.value)}
          options={[
            { value: '', label: t('allStatuses') },
            { value: 'true', label: t('statusActive') },
            { value: 'false', label: t('statusInactive') },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={UserRound} title={t('noUsers')} description={t('noUsersHint')} />
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          <Table>
            <THead className="border-b border-line">
              <Tr className="hover:bg-transparent">
                <Th>{t('colName')}</Th>
                <Th>{t('role')}</Th>
                <Th>{tc('department')}</Th>
                <Th>{t('status')}</Th>
                <Th className="text-end">{t('colActions')}</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName} src={u.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{u.fullName}</p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[u.role]}>{tRoles(u.role)}</Badge>
                  </Td>
                  <Td className="text-slate-600">{deptName(u.departmentId)}</Td>
                  <Td>
                    <Badge tone={u.active ? 'success' : 'neutral'}>
                      {u.active ? t('statusActive') : t('statusInactive')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                        aria-label={tc('edit')}
                        title={tc('edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-600"
                        aria-label={u.active ? t('deactivate') : t('activate')}
                        title={u.active ? t('deactivate') : t('activate')}
                      >
                        <UserCog size={16} />
                      </button>
                      <button
                        onClick={() => setDeleting(u)}
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
            <span>{t('resultsCount', { count: total })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tc('back')}
              </Button>
              <span className="tabular-nums">{t('pageOf', { page, pages })}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                {tc('next')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        departments={departments ?? []}
      />
      <UserImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('deleteUserTitle')}
        description={t('deleteUserConfirm', { name: deleting?.fullName ?? '' })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {tc('cancel')}
            </Button>
            <Button variant="danger" loading={deleteUser.isPending} onClick={confirmDelete}>
              {tc('delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('deleteUserHint')}</p>
      </Modal>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard roles={['admin']}>
      <AdminUsersInner />
    </RoleGuard>
  );
}
