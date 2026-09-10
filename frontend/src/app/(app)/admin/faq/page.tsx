'use client';

import { CircleHelp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { FaqFormModal } from '@/components/admin/faq-form-modal';
import { RoleGuard } from '@/components/app/role-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAdminFaqs, useDeleteFaq } from '@/hooks/use-assistant';
import { locales, localeNames } from '@/i18n/config';
import type { FaqEntry } from '@/types';

function FaqInner() {
  const t = useTranslations('faq');
  const tc = useTranslations('common');
  const toast = useToast();
  const { data, isPending, isError, refetch } = useAdminFaqs();
  const deleteFaq = useDeleteFaq();

  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FaqEntry | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = data ?? [];
    if (languageFilter) list = list.filter((f) => f.language === languageFilter);
    if (!q) return list;
    return list.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [data, search, languageFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(entry: FaqEntry) {
    setEditing(entry);
    setModalOpen(true);
  }

  async function onDelete(entry: FaqEntry) {
    if (!window.confirm(t('deleteConfirm', { question: entry.question }))) return;
    try {
      await deleteFaq.mutateAsync(entry.id);
      toast.success(t('deleted'));
    } catch {
      toast.error(tc('retry'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h2>
          <p className="mt-1 text-muted">{t('subtitle')}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          {t('newEntry')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="ps-10"
          />
        </div>
        <div className="w-40">
          <Select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            aria-label={tc('language')}
            options={[
              { value: '', label: t('allLanguages') },
              ...locales.map((l) => ({ value: l, label: localeNames[l] })),
            ]}
          />
        </div>
      </div>

      {isError ? (
        <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />
      ) : isPending ? (
        <LoadingState label={tc('loading')} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CircleHelp}
          title={search ? t('noMatch') : t('empty')}
          description={search ? undefined : t('emptyHint')}
          action={
            !search ? (
              <Button size="sm" onClick={openCreate}>
                <Plus size={16} />
                {t('newEntry')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white">
          <Table>
            <THead className="border-b border-line">
              <Tr className="hover:bg-transparent">
                <Th>{t('colQuestion')}</Th>
                <Th>{t('colCategory')}</Th>
                <Th>{t('colLanguage')}</Th>
                <Th>{t('colStatus')}</Th>
                <Th className="text-end">{t('colActions')}</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((f) => (
                <Tr key={f.id}>
                  <Td>
                    <p className="font-medium text-ink">{f.question}</p>
                    <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted">{f.answer}</p>
                  </Td>
                  <Td className="text-slate-600">{f.category || '—'}</Td>
                  <Td>
                    <Badge tone="neutral">{f.language.toUpperCase()}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={f.published ? 'success' : 'neutral'}>
                      {f.published ? t('statusPublished') : t('statusDraft')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(f)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label={tc('edit')}
                        title={tc('edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(f)}
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
        </div>
      )}

      <FaqFormModal open={modalOpen} onClose={() => setModalOpen(false)} entry={editing} />
    </div>
  );
}

export default function AdminFaqPage() {
  return (
    <RoleGuard roles={['admin']}>
      <FaqInner />
    </RoleGuard>
  );
}
