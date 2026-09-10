'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ContentType, Lesson, LessonInput } from '@/types';

const TYPES: ContentType[] = ['video', 'slides', 'pdf', 'audio', 'text'];

export function LessonForm({
  moduleId,
  lesson,
  defaultOrder,
  onSave,
  onCancel,
  saving,
}: {
  moduleId: string;
  lesson: Lesson | null;
  defaultOrder: number;
  onSave: (input: LessonInput) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tFormats = useTranslations('formats');

  const [title, setTitle] = useState(lesson?.title ?? '');
  const [type, setType] = useState<ContentType>(lesson?.type ?? 'video');
  const [externalUrl, setExternalUrl] = useState(lesson?.externalUrl ?? '');
  const [richText, setRichText] = useState(lesson?.richText ?? '');
  const [durationMinutes, setDurationMinutes] = useState(lesson?.durationMinutes ?? 0);
  const [isPreview, setIsPreview] = useState(lesson?.isPreview ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('required'));
      return;
    }
    const input: LessonInput = {
      moduleId,
      title: title.trim(),
      type,
      durationMinutes: Number(durationMinutes) || 0,
      order: lesson?.order ?? defaultOrder,
      isPreview,
      externalUrl: type === 'text' ? '' : externalUrl,
      richText: type === 'text' ? richText : '',
      file: type === 'text' ? null : file,
    };
    await onSave(input);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/20 p-4"
    >
      <p className="text-sm font-bold text-ink">{lesson ? t('editLesson') : t('newLesson')}</p>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Input label={t('lessonTitle')} required value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t('contentType')}
          value={type}
          onChange={(e) => setType(e.target.value as ContentType)}
          options={TYPES.map((ty) => ({ value: ty, label: tFormats(ty) }))}
        />
        <Input
          type="number"
          min={0}
          label={t('durationMinutes')}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />
      </div>

      {type === 'text' ? (
        <Textarea
          label={t('richText')}
          value={richText}
          onChange={(e) => setRichText(e.target.value)}
          rows={5}
          hint={t('richTextHint')}
        />
      ) : (
        <>
          <Input
            label={t('externalUrl')}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://…"
            hint={t('externalUrlHint')}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">{t('uploadFile')}</p>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
            />
            {lesson?.fileUrl && !file && <p className="mt-1 text-xs text-muted">{t('currentFileKept')}</p>}
          </div>
        </>
      )}

      <Checkbox
        label={t('isPreview')}
        checked={isPreview}
        onChange={(e) => setIsPreview(e.target.checked)}
      />

      <div className="flex justify-end gap-3 border-t border-line pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tc('cancel')}
        </Button>
        <Button type="submit" loading={saving}>
          {tc('save')}
        </Button>
      </div>
    </form>
  );
}
