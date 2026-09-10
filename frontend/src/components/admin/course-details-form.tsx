'use client';

import { FileCheck2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  CourseDetailsFields,
  PublishPanel,
  detailsFromCourse,
  toCourseInput,
  type CourseDetailsValue,
} from '@/components/admin/course-details-fields';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useUpdateCourse } from '@/hooks/use-authoring';
import type { CourseDetail } from '@/types';

export function CourseDetailsForm({ course }: { course: CourseDetail }) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const toast = useToast();
  const updateCourse = useUpdateCourse();

  const [value, setValue] = useState<CourseDetailsValue>(detailsFromCourse(course));
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<CourseDetailsValue>) => setValue((v) => ({ ...v, ...p }));

  async function save(published: boolean) {
    if (!value.title.trim() || !value.summary.trim()) {
      setError(t('titleSummaryRequired'));
      return;
    }
    setError(null);
    try {
      await updateCourse.mutateAsync({ slug: course.slug, input: toCourseInput(value, published) });
      toast.success(t('courseSaved'));
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  const saving = updateCourse.isPending;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <CourseDetailsFields value={value} onChange={patch} error={error} />
      <PublishPanel
        mandatory={value.mandatory}
        issuesCertificate={value.issuesCertificate}
        internalOnly={value.internalOnly}
        onChange={patch}
      >
        <Button fullWidth loading={saving} onClick={() => save(course.published)}>
          <FileCheck2 size={18} />
          {tc('saveChanges')}
        </Button>
        <Button
          fullWidth
          variant="secondary"
          disabled={saving}
          onClick={() => save(!course.published)}
        >
          {course.published ? t('unpublish') : t('publish')}
        </Button>
      </PublishPanel>
    </div>
  );
}
