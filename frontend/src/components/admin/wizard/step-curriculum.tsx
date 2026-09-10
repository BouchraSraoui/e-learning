'use client';

import {
  BookOpen,
  ChevronDown,
  CirclePlay,
  FileText,
  GripVertical,
  Headphones,
  Paperclip,
  Plus,
  Presentation,
  Trash2,
  X,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types';
import {
  type DraftChapter,
  type DraftLesson,
  LESSON_FILE_EXTENSIONS,
  blankChapter,
  blankLesson,
  lessonFileIssue,
  totalAttachments,
  totalDuration,
  totalLessons,
} from './wizard-types';

const FORMATS: ContentType[] = ['video', 'pdf', 'audio', 'slides'];

const TYPE_ICON: Record<ContentType, typeof CirclePlay> = {
  video: CirclePlay,
  pdf: FileText,
  audio: Headphones,
  slides: Presentation,
  text: BookOpen,
};

type SetChapters = (updater: (chapters: DraftChapter[]) => DraftChapter[]) => void;

function LessonAttachButton({
  lesson,
  lessonName,
  onFile,
  buttonRef,
}: {
  lesson: DraftLesson;
  lessonName: string;
  onFile: (file: File | null) => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const t = useTranslations('admin');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  if (lesson.type === 'text') return <span className="h-8 w-8 shrink-0" aria-hidden />;

  const issueMessage = (issue: NonNullable<ReturnType<typeof lessonFileIssue>>) => {
    switch (issue.kind) {
      case 'type':
        return t('fileTypeNotAllowed', { allowed: issue.allowed });
      case 'size':
        return t('fileTooLarge', { max: issue.maxMb });
      case 'empty':
        return t('fileEmpty');
      case 'name':
        return t('fileNameTooLong', { max: issue.max });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={LESSON_FILE_EXTENSIONS[lesson.type].join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (!file) return;
          const issue = lessonFileIssue(file, lesson.type);
          if (issue) {
            toast.error(issueMessage(issue));
            return;
          }
          onFile(file);
        }}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => inputRef.current?.click()}
        title={lesson.file ? t('replaceFile') : t('attachFile')}
        aria-label={t(lesson.file ? 'replaceFileFor' : 'attachFileTo', { lesson: lessonName })}
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
          lesson.file
            ? 'bg-primary-50 text-primary hover:bg-primary-100'
            : 'text-slate-400 hover:bg-primary-50 hover:text-primary',
        )}
      >
        <Paperclip size={15} />
      </button>
    </>
  );
}

export function StepCurriculum({
  chapters,
  setChapters,
}: {
  chapters: DraftChapter[];
  setChapters: SetChapters;
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tFormats = useTranslations('formats');
  const toast = useToast();
  const format = useFormatter();
  const attachRefs = useRef(new Map<string, HTMLButtonElement>());

  const sizeLabel = (bytes: number) =>
    bytes >= 1024 * 1024
      ? format.number(bytes / (1024 * 1024), {
          style: 'unit',
          unit: 'megabyte',
          maximumFractionDigits: 1,
        })
      : bytes >= 1024
        ? format.number(Math.round(bytes / 1024), { style: 'unit', unit: 'kilobyte' })
        : format.number(bytes, { style: 'unit', unit: 'byte' });

  const patchChapter = (id: string, patch: Partial<DraftChapter>) =>
    setChapters((chs) => chs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addChapter = () => setChapters((chs) => [...chs, blankChapter()]);
  const deleteChapter = (id: string) => setChapters((chs) => chs.filter((c) => c.id !== id));

  const addLesson = (chapterId: string, type: ContentType) =>
    setChapters((chs) =>
      chs.map((c) =>
        c.id === chapterId ? { ...c, collapsed: false, lessons: [...c.lessons, blankLesson(type)] } : c,
      ),
    );

  const patchLesson = (chapterId: string, lessonId: string, patch: Partial<DraftChapter['lessons'][number]>) =>
    setChapters((chs) =>
      chs.map((c) =>
        c.id === chapterId
          ? { ...c, lessons: c.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) }
          : c,
      ),
    );

  const deleteLesson = (chapterId: string, lessonId: string) =>
    setChapters((chs) =>
      chs.map((c) =>
        c.id === chapterId ? { ...c, lessons: c.lessons.filter((l) => l.id !== lessonId) } : c,
      ),
    );

  const allCollapsed = chapters.length > 0 && chapters.every((c) => c.collapsed);
  const toggleAll = () =>
    setChapters((chs) => chs.map((c) => ({ ...c, collapsed: !allCollapsed })));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('curriculum')}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {t('chaptersLessonsCount', { chapters: chapters.length, lessons: totalLessons(chapters) })}
            </p>
          </div>
          {chapters.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {allCollapsed ? t('expandAll') : t('collapseAll')}
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {chapters.map((chapter, ci) => (
            <div key={chapter.id} className="rounded-2xl border border-line bg-white shadow-card">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <GripVertical size={16} className="shrink-0 text-slate-300" />
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-50 text-xs font-bold text-primary">
                  {ci + 1}
                </span>
                <input
                  value={chapter.title}
                  onChange={(e) => patchChapter(chapter.id, { title: e.target.value })}
                  placeholder={t('chapterTitle')}
                  className="flex-1 bg-transparent text-sm font-bold text-ink placeholder:font-medium placeholder:text-slate-400 focus:outline-none"
                />
                <span className="shrink-0 text-xs text-muted">
                  {t('lessonsCount', { count: chapter.lessons.length })}
                </span>
                <button
                  type="button"
                  onClick={() => deleteChapter(chapter.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={tc('delete')}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => patchChapter(chapter.id, { collapsed: !chapter.collapsed })}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label={chapter.collapsed ? t('expandAll') : t('collapseAll')}
                >
                  <ChevronDown
                    size={18}
                    className={cn('transition-transform', chapter.collapsed && '-rotate-90')}
                  />
                </button>
              </div>

              {!chapter.collapsed && (
                <div className="border-t border-line">
                  {chapter.lessons.map((lesson, li) => {
                    const Icon = TYPE_ICON[lesson.type];
                    const lessonName = lesson.title.trim() || t('lessonN', { n: li + 1 });
                    return (
                      <div key={lesson.id} className="border-b border-line last:border-b-0">
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <GripVertical size={15} className="shrink-0 text-slate-300" />
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                            <Icon size={15} />
                          </span>
                          <input
                            value={lesson.title}
                            onChange={(e) => patchLesson(chapter.id, lesson.id, { title: e.target.value })}
                            placeholder={t('lessonTitle')}
                            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                          />
                          <div className="w-28 shrink-0">
                            <Select
                              value={lesson.type}
                              onChange={(e) => {
                                const nextType = e.target.value as ContentType;
                                const keepFile =
                                  lesson.file && !lessonFileIssue(lesson.file, nextType);
                                if (lesson.file && !keepFile) {
                                  toast.info(
                                    t('fileRemovedTypeChange', { name: lesson.file.name }),
                                  );
                                }
                                patchLesson(chapter.id, lesson.id, {
                                  type: nextType,
                                  file: keepFile ? lesson.file : null,
                                });
                              }}
                              options={FORMATS.map((f) => ({ value: f, label: tFormats(f) }))}
                            />
                          </div>
                          <div className="flex w-24 shrink-0 items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={lesson.durationMinutes}
                              onChange={(e) =>
                                patchLesson(chapter.id, lesson.id, {
                                  durationMinutes: Number(e.target.value),
                                })
                              }
                              className="h-9 w-14 rounded-lg border border-line bg-white px-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            />
                            <span className="text-xs text-muted">{t('min')}</span>
                          </div>
                          <LessonAttachButton
                            lesson={lesson}
                            lessonName={lessonName}
                            onFile={(file) => patchLesson(chapter.id, lesson.id, { file })}
                            buttonRef={(el) => {
                              if (el) attachRefs.current.set(lesson.id, el);
                              else attachRefs.current.delete(lesson.id);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => deleteLesson(chapter.id, lesson.id)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={tc('delete')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        {lesson.file && (
                          <div className="flex items-center gap-2 px-4 pb-2.5 ps-[87px]">
                            <Paperclip size={13} className="shrink-0 text-primary" />
                            <span className="min-w-0 truncate text-xs font-medium text-slate-600">
                              {lesson.file.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {sizeLabel(lesson.file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                patchLesson(chapter.id, lesson.id, { file: null });
                                attachRefs.current.get(lesson.id)?.focus();
                              }}
                              title={t('removeFile')}
                              className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              aria-label={t('removeFileNamed', { file: lesson.file.name })}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    {FORMATS.map((f) => {
                      const Icon = TYPE_ICON[f];
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => addLesson(chapter.id, f)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary"
                        >
                          <Icon size={14} />
                          {tFormats(f)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addChapter}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/60 px-4 py-3.5 text-sm font-semibold text-primary hover:border-primary-300 hover:bg-primary-50/40"
          >
            <Plus size={16} />
            {t('addChapter')}
          </button>
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-6">
        <h3 className="text-base font-bold text-ink">{t('courseOutline')}</h3>
        {chapters.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t('noChapters')}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {chapters.map((chapter, ci) => (
              <li key={chapter.id} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-primary-50 text-[11px] font-bold text-primary">
                  {ci + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {chapter.title || t('chapterN', { n: ci + 1 })}
                  </p>
                  <p className="text-xs text-muted">
                    {t('lessonsCount', { count: chapter.lessons.length })} ·{' '}
                    {t('minutesCount', { count: totalDuration([chapter]) })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm font-semibold text-ink">{t('totalDuration')}</span>
          <span className="text-sm font-bold text-ink">
            {t('minutesCount', { count: totalDuration(chapters) })}
          </span>
        </div>
        {totalAttachments(chapters) > 0 && (
          <>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{t('attachmentsLabel')}</span>
              <span className="text-sm font-bold text-ink">{totalAttachments(chapters)}</span>
            </div>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
              {t('attachmentsNote')}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
