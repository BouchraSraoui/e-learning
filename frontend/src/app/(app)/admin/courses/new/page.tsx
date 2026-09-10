'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  LogOut,
  Rocket,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { RoleGuard } from '@/components/app/role-guard';
import { StepCurriculum } from '@/components/admin/wizard/step-curriculum';
import { StepDetails } from '@/components/admin/wizard/step-details';
import { StepQuiz } from '@/components/admin/wizard/step-quiz';
import { StepReview } from '@/components/admin/wizard/step-review';
import {
  type CourseDraft,
  type DraftChapter,
  type DraftDetails,
  type DraftQuiz,
  emptyDraft,
  inferPrimaryFormat,
  storableChapters,
  totalAttachments,
  totalDuration,
} from '@/components/admin/wizard/wizard-types';
import { buttonClasses } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { services } from '@/services';
import type { QuestionInput, QuizInput } from '@/types';

const DRAFT_KEY = 'icosnet.course-draft';

function buildQuestions(quiz: DraftQuiz): { questions: QuestionInput[] } | { error: string } {
  const questions: QuestionInput[] = [];
  for (const [qi, q] of quiz.questions.entries()) {
    if (!q.text.trim()) return { error: 'questionTextRequired' };
    const answers = q.options.filter((o) => o.text.trim());
    if (answers.length < 2) return { error: 'needTwoAnswers' };
    const correct = answers.filter((o) => o.correct);
    if (correct.length < 1) return { error: 'needCorrectAnswer' };
    if ((q.type === 'single' || q.type === 'dropdown') && correct.length !== 1)
      return { error: 'singleOneCorrect' };
    if (q.type === 'true_false' && answers.length !== 2) return { error: 'trueFalseTwo' };
    questions.push({
      text: q.text.trim(),
      type: q.type,
      points: Number(q.points) || 1,
      order: qi,
      answers: answers.map((o, ai) => ({ text: o.text.trim(), isCorrect: o.correct, order: ai })),
    });
  }
  return { questions };
}

function BuilderInner() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<DraftDetails>(() => emptyDraft().details);
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [quiz, setQuiz] = useState<DraftQuiz>(() => emptyDraft().quiz);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const draft: CourseDraft = { details, chapters, quiz };

  const restored = useRef(false);
  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as CourseDraft;
          if (saved.details) setDetails(saved.details);
          if (saved.chapters) {
            const lostFiles = saved.chapters.some((c) => c.lessons.some((l) => l.hadFile));
            setChapters(
              saved.chapters.map((c) => ({
                ...c,
                lessons: c.lessons.map((l) => ({ ...l, file: null, hadFile: false })),
              })),
            );
            if (lostFiles) toast.error(t('attachmentsNotRestored'));
          }
          if (saved.quiz) setQuiz(saved.quiz);
          setSavedOnce(true);
        }
      } catch {
      }
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ details, chapters: storableChapters(chapters), quiz }),
        );
        setSavedOnce(true);
      } catch {
      }
    }, 700);
    return () => clearTimeout(id);
  }, [details, chapters, quiz]);

  function onThumbnail(file: File | null) {
    setThumbnail(file);
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  const patchDetails = (p: Partial<DraftDetails>) => setDetails((d) => ({ ...d, ...p }));

  async function persist(published: boolean) {
    if (!details.title.trim() || !details.description.trim()) {
      toast.error(t('titleDescriptionRequired'));
      setStep(0);
      return;
    }
    if (chapters.some((c) => !c.title.trim())) {
      toast.error(t('chapterTitleRequired'));
      setStep(1);
      return;
    }
    if (chapters.some((c) => c.lessons.some((l) => !l.title.trim()))) {
      toast.error(t('lessonTitleRequired'));
      setStep(1);
      return;
    }
    const built = buildQuestions(quiz);
    if ('error' in built) {
      toast.error(t(built.error as never));
      setStep(2);
      return;
    }

    setSaving(true);
    let created: { slug: string } | null = null;
    try {
      const course = await services.courses.createCourse({
        title: details.title.trim(),
        summary: details.description.trim(),
        description: details.description.trim(),
        objectives: [],
        categoryId: details.categoryId || null,
        level: details.level,
        primaryFormat: inferPrimaryFormat(chapters),
        durationMinutes: totalDuration(chapters),
        mandatory: details.mandatory,
        published,
        issuesCertificate: details.issuesCertificate,
        internalOnly: details.internalOnly,
        audience: details.audience,
        departmentId: details.audience === 'department' ? details.departmentId || null : null,
        language: details.language,
        sequentialUnlock: details.sequentialUnlock,
      });
      created = course;

      if (thumbnail) {
        try {
          await services.courses.uploadThumbnail(course.slug, thumbnail);
        } catch {
        }
      }

      let mediaFailures = 0;
      for (const [ci, chapter] of chapters.entries()) {
        const { id: moduleId } = await services.courses.createModule({
          courseId: course.id,
          title: chapter.title.trim(),
          order: ci,
        });
        for (const [li, lesson] of chapter.lessons.entries()) {
          const input = {
            moduleId,
            title: lesson.title.trim(),
            type: lesson.type,
            durationMinutes: Number(lesson.durationMinutes) || 0,
            order: li,
            isPreview: false,
            externalUrl: '',
            richText: '',
            file: lesson.file ?? null,
          };
          try {
            await services.courses.createLesson(input);
          } catch (err) {
            // Retry without the file only when the server definitively rejected
            // the upload (400 validation / 413 body-size limit) — the lesson
            // still lands and the file can be re-attached in the edit builder.
            // A network drop or 5xx may have committed server-side; retrying
            // there would risk a duplicate lesson, so rethrow instead.
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (!input.file || (status !== 400 && status !== 413)) throw err;
            mediaFailures += 1;
            await services.courses.createLesson({ ...input, file: null });
          }
        }
      }

      if (built.questions.length > 0) {
        const quizInput: QuizInput = {
          courseId: course.id,
          moduleId: null,
          title: details.title.trim(),
          description: '',
          passScore: Number(quiz.passScore) || 0,
          maxAttempts: 0,
          published: true,
          questions: built.questions,
          shuffleQuestions: quiz.shuffleQuestions,
          revealAnswers: quiz.revealAnswers,
        };
        await services.assessments.createQuiz(quizInput);
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
      }
      qc.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success(published ? t('coursePublished') : t('courseCreated'));
      if (mediaFailures > 0) toast.error(t('lessonMediaFailed'));
      router.push(`/admin/courses/${course.slug}/edit`);
    } catch {
      toast.error(t('saveFailed'));
      if (created) router.push(`/admin/courses/${created.slug}/edit`);
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { title: t('stepDetails'), sub: t('stepDetailsSub') },
    { title: t('stepCurriculum'), sub: t('stepCurriculumSub') },
    { title: t('stepQuiz'), sub: t('stepQuizSub') },
    { title: t('stepReview'), sub: t('stepReviewSub') },
  ];
  const isLast = step === 3;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-white px-4 sm:px-6">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <LogOut size={16} className="rtl:rotate-180" />
          {t('exit')}
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
            <GraduationCap size={18} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('courseBuilder')} · {t('draft')}
            </p>
            <p className="truncate text-sm font-bold text-ink">
              {details.title || t('untitledCourse')}
            </p>
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {savedOnce &&
            (totalAttachments(chapters) > 0 ? (
              <span className="hidden items-center gap-1.5 text-xs font-medium text-amber-600 sm:inline-flex">
                <TriangleAlert size={14} />
                {t('savedExceptFiles')}
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-600 sm:inline-flex">
                <Check size={14} />
                {t('savedJustNow')}
              </span>
            ))}
          <button
            type="button"
            onClick={() => persist(false)}
            disabled={saving}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <Save size={16} />
            {t('saveDraft')}
          </button>
          <button
            type="button"
            onClick={() => persist(true)}
            disabled={saving}
            className={buttonClasses({ size: 'sm' })}
          >
            <Rocket size={15} />
            {t('publish')}
          </button>
        </div>
      </header>

      <nav className="shrink-0 border-b border-line bg-white px-4 sm:px-6">
        <ol className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto py-3 scrollbar-slim">
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={i} className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                      active && 'bg-primary text-white',
                      done && 'bg-emerald-500 text-white',
                      !active && !done && 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {done ? <Check size={15} /> : i + 1}
                  </span>
                  <span className="hidden min-w-0 text-start leading-tight sm:block">
                    <span className={cn('block text-sm font-bold', active ? 'text-ink' : 'text-slate-500')}>
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-muted">{s.sub}</span>
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <span className="h-px w-6 shrink-0 bg-line sm:w-10" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex-1 overflow-y-auto scrollbar-slim">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {step === 0 && (
            <StepDetails
              details={details}
              onChange={patchDetails}
              thumbnailPreview={thumbnailPreview}
              onThumbnail={onThumbnail}
            />
          )}
          {step === 1 && <StepCurriculum chapters={chapters} setChapters={setChapters} />}
          {step === 2 && <StepQuiz quiz={quiz} setQuiz={setQuiz} />}
          {step === 3 && (
            <StepReview
              draft={draft}
              thumbnailPreview={thumbnailPreview}
              saving={saving}
              onPublish={() => persist(true)}
              onSaveDraft={() => persist(false)}
            />
          )}
        </div>
      </div>

      <footer className="flex h-16 shrink-0 items-center gap-4 border-t border-line bg-white px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={buttonClasses({
            variant: 'secondary',
            className: 'disabled:pointer-events-none disabled:opacity-40',
          })}
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {tc('back')}
        </button>

        <span className="ms-auto text-sm text-muted">
          {t('stepOf', { step: step + 1, total: steps.length })}
        </span>

        {isLast ? (
          <button
            type="button"
            onClick={() => persist(true)}
            disabled={saving}
            className={buttonClasses({})}
          >
            <Rocket size={16} />
            {t('publishCourse')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            className={buttonClasses({})}
          >
            {step === 2 ? t('stepReview') : tc('next')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </button>
        )}
      </footer>
    </div>
  );
}

export default function NewCoursePage() {
  return (
    <RoleGuard roles={['admin', 'manager']}>
      <BuilderInner />
    </RoleGuard>
  );
}
