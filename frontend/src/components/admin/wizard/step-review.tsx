'use client';

import {
  Award,
  BookOpen,
  Circle,
  CircleCheck,
  CirclePlay,
  FileText,
  Headphones,
  Paperclip,
  Presentation,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/use-reference';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types';
import { type CourseDraft, totalAttachments, totalDuration, totalLessons, totalPoints } from './wizard-types';

const TYPE_ICON: Record<ContentType, typeof CirclePlay> = {
  video: CirclePlay,
  pdf: FileText,
  audio: Headphones,
  slides: Presentation,
  text: BookOpen,
};

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="px-4 py-3 text-center first:ps-0">
      <p className={cn('text-xl font-extrabold', tone ?? 'text-ink')}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function Check({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {done ? (
        <CircleCheck size={18} className="shrink-0 text-emerald-500" />
      ) : (
        <Circle size={18} className="shrink-0 text-slate-300" />
      )}
      <span className={done ? 'text-slate-700' : 'text-slate-400'}>{children}</span>
    </li>
  );
}

export function StepReview({
  draft,
  thumbnailPreview,
  saving,
  onPublish,
  onSaveDraft,
}: {
  draft: CourseDraft;
  thumbnailPreview: string | null;
  saving: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
}) {
  const t = useTranslations('admin');
  const tLevels = useTranslations('levels');
  const { data: categories } = useCategories();

  const { details, chapters, quiz } = draft;
  const categoryName = categories?.find((c) => c.id === details.categoryId)?.name ?? null;
  const lessons = totalLessons(chapters);
  const duration = totalDuration(chapters);
  const questions = quiz.questions.length;
  const attached = totalAttachments(chapters);
  const mediaCapable = chapters.reduce(
    (n, c) => n + c.lessons.filter((l) => l.type !== 'text').length,
    0,
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('reviewPublish')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('reviewPublishSub')}</p>
        </div>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex gap-4">
            <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-50 text-primary">
              {thumbnailPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <TrendingUp size={24} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {categoryName && <span className="text-primary">{categoryName}</span>}
                {categoryName && <span className="text-slate-300"> · </span>}
                <span className="text-muted">{tLevels(details.level)}</span>
              </p>
              <h3 className="mt-1 text-lg font-bold text-ink">
                {details.title || t('courseTitle')}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{details.description}</p>
            </div>
          </div>

          <div className="mt-5 flex divide-x divide-line border-t border-line pt-4">
            <Stat value={chapters.length} label={t('chaptersLabel')} />
            <Stat value={lessons} label={t('lessonsLabel')} />
            <Stat value={t('minutesShort', { count: duration })} label={t('durationLabel')} tone="text-violet-600" />
            <Stat value={questions} label={t('quizQuestionsLabel')} tone="text-amber-600" />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h3 className="text-base font-bold text-ink">{t('curriculum')}</h3>
          {chapters.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t('noChapters')}</p>
          ) : (
            <ol className="mt-3 space-y-4">
              {chapters.map((chapter, ci) => (
                <li key={chapter.id}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-primary-50 text-[11px] font-bold text-primary">
                      {ci + 1}
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {chapter.title || t('chapterN', { n: ci + 1 })}
                    </span>
                    <span className="text-xs text-muted">
                      {t('lessonsCount', { count: chapter.lessons.length })}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1.5 ps-7">
                    {chapter.lessons.map((lesson) => {
                      const Icon = TYPE_ICON[lesson.type];
                      return (
                        <li key={lesson.id} className="flex items-center gap-2 text-sm">
                          <Icon size={15} className="shrink-0 text-primary" />
                          <span className="flex-1 truncate text-slate-700">
                            {lesson.title || t('lessonTitle')}
                          </span>
                          {lesson.file && (
                            <span title={lesson.file.name} className="shrink-0 text-primary">
                              <Paperclip size={13} />
                              <span className="sr-only">
                                {t('attachmentsLabel')}: {lesson.file.name}
                              </span>
                            </span>
                          )}
                          <span className="text-xs text-muted">
                            {t('minutesCount', { count: lesson.durationMinutes })}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-6">
        <h3 className="text-base font-bold text-ink">{t('readyToPublish')}</h3>
        <ul className="mt-4 space-y-3">
          <Check done={Boolean(details.title.trim() && details.description.trim())}>
            {t('checkTitleDesc')}
          </Check>
          <Check done={lessons > 0}>
            {t('checkLessons', { lessons, chapters: chapters.length })}
          </Check>
          <Check done={questions > 0}>
            {questions > 0
              ? t('checkQuiz', { count: questions, score: quiz.passScore })
              : t('checkNoQuiz')}
          </Check>
          {mediaCapable > 0 && (
            <Check done={attached > 0}>
              {attached > 0
                ? t('checkMedia', { count: attached, total: mediaCapable })
                : t('checkNoMedia')}
            </Check>
          )}
          <Check done={details.issuesCertificate}>
            {details.issuesCertificate ? t('checkCertificate') : t('checkNoCertificate')}
          </Check>
        </ul>
        {attached > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
            {t('attachmentsNote')}
          </p>
        )}

        <div className="mt-5 space-y-2.5 border-t border-line pt-5">
          <Button fullWidth loading={saving} onClick={onPublish}>
            <Award size={18} />
            {t('publishCourse')}
          </Button>
          <Button fullWidth variant="secondary" disabled={saving} onClick={onSaveDraft}>
            {t('saveDraft')}
          </Button>
        </div>
      </aside>
    </div>
  );
}
