'use client';

import { ImageIcon, Lightbulb, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCategories, useDepartments } from '@/hooks/use-reference';
import { localeNames, locales } from '@/i18n/config';
import { cn } from '@/lib/utils';
import type { ContentType, CourseAudience, CourseLevel } from '@/types';
import type { CourseLanguage, DraftDetails } from './wizard-types';

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const AUDIENCES: CourseAudience[] = ['open', 'general', 'department'];

export function StepDetails({
  details,
  onChange,
  thumbnailPreview,
  onThumbnail,
}: {
  details: DraftDetails;
  onChange: (patch: Partial<DraftDetails>) => void;
  thumbnailPreview: string | null;
  onThumbnail: (file: File | null) => void;
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tLevels = useTranslations('levels');
  const { data: categories } = useCategories();
  const { data: departments } = useDepartments();
  const fileRef = useRef<HTMLInputElement>(null);

  const categoryOptions = [
    { value: '', label: t('noCategory') },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const departmentOptions = [
    { value: '', label: t('selectDepartment') },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-base font-bold text-ink">{t('courseDetails')}</h3>
          <div className="mt-5 space-y-5">
            <Input
              label={t('courseTitle')}
              value={details.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={t('courseTitlePlaceholder')}
            />
            <Textarea
              label={t('description')}
              value={details.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              placeholder={t('descriptionPlaceholder')}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label={t('category')}
                value={details.categoryId}
                onChange={(e) => onChange({ categoryId: e.target.value })}
                options={categoryOptions}
              />
              <Select
                label={t('level')}
                value={details.level}
                onChange={(e) => onChange({ level: e.target.value as CourseLevel })}
                options={LEVELS.map((l) => ({ value: l, label: tLevels(l) }))}
              />
              <Select
                label={t('language')}
                value={details.language}
                onChange={(e) => onChange({ language: e.target.value as CourseLanguage })}
                options={locales.map((l) => ({ value: l, label: localeNames[l] }))}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-base font-bold text-ink">{t('thumbnail')}</h3>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => onThumbnail(e.target.files?.[0] ?? null)}
          />
          {thumbnailPreview ? (
            <div className="relative mt-4 overflow-hidden rounded-xl border border-line">
              <img src={thumbnailPreview} alt="" className="aspect-[16/9] w-full object-cover" />
              <button
                type="button"
                onClick={() => onThumbnail(null)}
                className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-600 shadow-card hover:text-rose-600"
                aria-label={tc('remove')}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-slate-50/50 px-4 py-10 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/30"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-400 shadow-card">
                <ImageIcon size={20} />
              </span>
              <span className="text-sm text-slate-600">
                {t('thumbnailDropPre')}{' '}
                <span className="font-semibold text-primary">{t('thumbnailBrowse')}</span>
              </span>
              <span className="text-xs text-muted">{t('thumbnailHint')}</span>
            </button>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="text-base font-bold text-ink">{t('settings')}</h3>
          <div className="mt-5 space-y-5">
            <Select
              label={t('audience')}
              hint={t('audienceHint')}
              value={details.audience}
              onChange={(e) =>
                onChange({
                  audience: e.target.value as CourseAudience,
                  ...(e.target.value !== 'department' ? { departmentId: '' } : {}),
                })
              }
              options={AUDIENCES.map((a) => ({ value: a, label: t(`audience_${a}`) }))}
            />
            {details.audience === 'department' && (
              <Select
                label={t('targetDepartment')}
                value={details.departmentId}
                onChange={(e) => onChange({ departmentId: e.target.value })}
                options={departmentOptions}
              />
            )}
            <Switch
              label={t('requiredCourse')}
              hint={t('settingRequiredHint')}
              checked={details.mandatory}
              onChange={(v) => onChange({ mandatory: v })}
            />
            <Switch
              label={t('issueCertificate')}
              hint={t('settingCertificateHint')}
              checked={details.issuesCertificate}
              onChange={(v) => onChange({ issuesCertificate: v })}
            />
            <Switch
              label={t('internalOnly')}
              hint={t('settingInternalOnlyHint')}
              checked={details.internalOnly}
              onChange={(v) => onChange({ internalOnly: v })}
            />
            <Switch
              label={t('sequentialUnlock')}
              hint={t('settingSequentialHint')}
              checked={details.sequentialUnlock}
              onChange={(v) => onChange({ sequentialUnlock: v })}
            />
          </div>
        </section>

        <aside className={cn('rounded-2xl border border-primary-100 bg-primary-50/50 p-5')}>
          <p className="flex items-center gap-2 text-sm font-bold text-primary-700">
            <Lightbulb size={16} />
            {t('beforeYouBuild')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-primary-900/70">{t('beforeYouBuildHint')}</p>
        </aside>
      </div>
    </div>
  );
}
