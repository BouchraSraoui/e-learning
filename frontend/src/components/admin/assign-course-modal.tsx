'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useAssignableUsers, useCreateAssignment } from '@/hooks/use-management';
import { services } from '@/services';

export function AssignCourseModal({
  open,
  onClose,
  presetCourseId,
  presetCourseTitle,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, the course is fixed (assigning from a course page) and the picker is hidden. */
  presetCourseId?: string;
  presetCourseTitle?: string;
}) {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const toast = useToast();
  const { data: users } = useAssignableUsers();
  const { data: courses } = useQuery({
    queryKey: ['assignable-courses'],
    queryFn: () => services.courses.list({ pageSize: 100, ordering: 'title' }),
    enabled: open && !presetCourseId,
  });
  const createAssignment = useCreateAssignment();

  const [userId, setUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setUserId('');
    setCourseId(presetCourseId ?? '');
    setDueDate('');
    setNote('');
  }, [open, presetCourseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !courseId) {
      setError(t('pickUserAndCourse'));
      return;
    }
    try {
      await createAssignment.mutateAsync({ userId, courseId, dueDate: dueDate || null, note });
      toast.success(t('assigned'));
      onClose();
    } catch {
      toast.error(t('assignFailed'));
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('assignCourse')} description={t('assignHint')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <Select
          label={t('learner')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder={t('pickLearner')}
          options={(users ?? []).map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))}
        />
        {presetCourseId ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">{t('course')}</p>
            <p className="rounded-lg border border-line bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink">
              {presetCourseTitle}
            </p>
          </div>
        ) : (
          <Select
            label={t('course')}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder={t('pickCourse')}
            options={(courses?.results ?? []).map((c) => ({ value: c.id, label: c.title }))}
          />
        )}
        <Input type="date" label={t('dueDate')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Textarea label={t('note')} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={createAssignment.isPending}>
            {t('assign')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
