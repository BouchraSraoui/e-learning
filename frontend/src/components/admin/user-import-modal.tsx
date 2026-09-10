'use client';

import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useImportUsers } from '@/hooks/use-admin-users';
import { downloadFile } from '@/lib/download';
import { services } from '@/services';
import type { UserImportReport } from '@/types';

export function UserImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const toast = useToast();
  const importUsers = useImportUsers();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<UserImportReport | null>(null);

  function close() {
    setFile(null);
    setReport(null);
    onClose();
  }

  async function onImport() {
    if (!file) return;
    try {
      const result = await importUsers.mutateAsync(file);
      setReport(result);
      toast.success(t('importDone', { created: result.created, updated: result.updated }));
    } catch {
      toast.error(t('importFailed'));
    }
  }

  async function onTemplate() {
    try {
      downloadFile(await services.users.importTemplate('csv'));
    } catch {
      toast.error(t('importFailed'));
    }
  }

  return (
    <Modal open={open} onClose={close} size="xl" title={t('importTitle')} description={t('importHint')}>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line bg-slate-50/60 px-4 py-6 text-start hover:border-primary-300 hover:bg-primary-50/40"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
            <FileSpreadsheet size={22} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {file ? file.name : t('chooseFile')}
            </span>
            <span className="block text-xs text-muted">{t('fileFormats')}</span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setReport(null);
          }}
        />

        {report && (
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-emerald-700">
                {t('createdCount', { count: report.created })}
              </span>
              <span className="font-semibold text-primary-700">
                {t('updatedCount', { count: report.updated })}
              </span>
              {report.errors.length > 0 && (
                <span className="font-semibold text-rose-700">
                  {t('errorCount', { count: report.errors.length })}
                </span>
              )}
            </div>
            {report.errors.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-xs scrollbar-slim">
                <ul className="space-y-1.5">
                  {report.errors.map((e) => (
                    <li key={e.row} className="text-rose-700">
                      <span className="font-semibold">{t('rowLabel', { row: e.row })}</span>{' '}
                      {e.email && <span className="text-rose-500">({e.email})</span>}{' '}
                      {e.messages.join(' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onTemplate}>
            <Download size={16} />
            {t('downloadTemplate')}
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={close}>
              {report ? tc('close') : tc('cancel')}
            </Button>
            <Button type="button" onClick={onImport} loading={importUsers.isPending} disabled={!file}>
              <Upload size={16} />
              {t('runImport')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
