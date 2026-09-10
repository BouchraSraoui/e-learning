'use client';

import { useTranslations } from 'next-intl';
import { Card, CardBody } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCategories, useDepartments } from '@/hooks/use-reference';
import type { ContentType, CourseAudience, CourseDetail, CourseInput, CourseLevel } from '@/types';

export const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
export const FORMATS: ContentType[] = ['video', 'slides', 'pdf', 'audio', 'text'];
export const AUDIENCES: CourseAudience[] = ['open', 'general', 'department'];

export interface CourseDetailsValue {
  title: string;
  summary: string;
  description: string;
  categoryId: string;
  level: CourseLevel;
  primaryFormat: ContentType;
  durationMinutes: number;
  objectives: string;
  mandatory: boolean;
  issuesCertificate: boolean;
  internalOnly: boolean;
  audience: CourseAudience;
  departmentId: string;
}

export function detailsFromCourse(course: CourseDetail | null): CourseDetailsValue {
  return {
    title: course?.title ?? '',
    summary: course?.summary ?? '',
    description: course?.description ?? '',
    categoryId: course?.categoryId ?? '',
    level: course?.level ?? 'beginner',
    primaryFormat: course?.primaryFormat ?? 'video',
    durationMinutes: course?.durationMinutes ?? 0,
    objectives: (course?.objectives ?? []).join('\n'),
    mandatory: course?.mandatory ?? false,
    issuesCertificate: course?.issuesCertificate ?? true,
    internalOnly: course?.internalOnly ?? false,
    audience: course?.audience ?? 'open',
    departmentId: course?.departmentId ?? '',
  };
}

export function toCourseInput(v: CourseDetailsValue, published: boolean): CourseInput {
  return {
    title: v.title.trim(),
    summary: v.summary.trim(),
    description: v.description,
    objectives: v.objectives.split('\n').map((o) => o.trim()).filter(Boolean),
    categoryId: v.categoryId || null,
    level: v.level,
    primaryFormat: v.primaryFormat,
    durationMinutes: Number(v.durationMinutes) || 0,
    mandatory: v.mandatory,
    issuesCertificate: v.issuesCertificate,
    internalOnly: v.internalOnly,
    audience: v.audience,
    departmentId: v.audience === 'department' ? v.departmentId || null : null,
    published,
  };
}

export function CourseDetailsFields({
  value,
  onChange,
  error,
}: {
  value: CourseDetailsValue;
  onChange: (patch: Partial<CourseDetailsValue>) => void;
  error?: string | null;
}) {
  const t = useTranslations('admin');
  const tLevels = useTranslations('levels');
  const tFormats = useTranslations('formats');
  const { data: categories } = useCategories();
  const { data: departments } = useDepartments();
  const categoryOptions = [
    { value: '', label: t('noCategory') },
    ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const departmentOptions = [
    { value: '', label: t('selectDepartment') },
    ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
  ];

  return (
    <Card>
      <CardBody className="space-y-5">
        <h3 className="text-lg font-bold text-ink">{t('courseDetails')}</h3>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>
        )}

        <Input
          label={t('courseTitle')}
          required
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t('courseTitlePlaceholder')}
        />
        <Textarea
          label={t('description')}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder={t('descriptionPlaceholder')}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label={t('category')}
            value={value.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            options={categoryOptions}
          />
          <Select
            label={t('level')}
            value={value.level}
            onChange={(e) => onChange({ level: e.target.value as CourseLevel })}
            options={LEVELS.map((l) => ({ value: l, label: tLevels(l) }))}
          />
          <Input
            type="number"
            min={0}
            label={t('durationMin')}
            value={value.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
          />
        </div>
        <Input
          label={t('summary')}
          required
          value={value.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          hint={t('summaryHint')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('primaryFormat')}
            value={value.primaryFormat}
            onChange={(e) => onChange({ primaryFormat: e.target.value as ContentType })}
            options={FORMATS.map((f) => ({ value: f, label: tFormats(f) }))}
          />
          <Select
            label={t('audience')}
            hint={t('audienceHint')}
            value={value.audience}
            onChange={(e) =>
              onChange({
                audience: e.target.value as CourseAudience,
                ...(e.target.value !== 'department' ? { departmentId: '' } : {}),
              })
            }
            options={AUDIENCES.map((a) => ({ value: a, label: t(`audience_${a}`) }))}
          />
          {value.audience === 'department' && (
            <Select
              label={t('targetDepartment')}
              value={value.departmentId}
              onChange={(e) => onChange({ departmentId: e.target.value })}
              options={departmentOptions}
            />
          )}
        </div>
        <Textarea
          label={t('objectives')}
          value={value.objectives}
          onChange={(e) => onChange({ objectives: e.target.value })}
          hint={t('objectivesHint')}
          rows={3}
        />
      </CardBody>
    </Card>
  );
}

export function PublishPanel({
  mandatory,
  issuesCertificate,
  internalOnly,
  onChange,
  children,
}: {
  mandatory: boolean;
  issuesCertificate: boolean;
  internalOnly: boolean;
  onChange: (
    patch: Partial<Pick<CourseDetailsValue, 'mandatory' | 'issuesCertificate' | 'internalOnly'>>,
  ) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations('admin');
  return (
    <Card className="lg:sticky lg:top-6">
      <CardBody className="space-y-5">
        <h3 className="text-lg font-bold text-ink">{t('publishPanel')}</h3>
        <Switch
          label={t('requiredCourse')}
          hint={t('requiredCourseHint')}
          checked={mandatory}
          onChange={(v) => onChange({ mandatory: v })}
        />
        <Switch
          label={t('issueCertificate')}
          hint={t('issueCertificateHint')}
          checked={issuesCertificate}
          onChange={(v) => onChange({ issuesCertificate: v })}
        />
        <Switch
          label={t('internalOnly')}
          hint={t('settingInternalOnlyHint')}
          checked={internalOnly}
          onChange={(v) => onChange({ internalOnly: v })}
        />
        <div className="space-y-2.5 border-t border-line pt-4">{children}</div>
      </CardBody>
    </Card>
  );
}
