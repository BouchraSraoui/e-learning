'use client';

import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, CircleHelp, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LessonViewer } from '@/components/learn/lesson-viewer';
import { QuizPlayer } from '@/components/learn/quiz-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useNetworkMode } from '@/context/network-mode-context';
import { useCertificates } from '@/hooks/use-certificates';
import { useEnrollment, useSaveLessonProgress } from '@/hooks/use-enrollment';
import { useCourse } from '@/hooks/use-courses';
import { CONTENT_TYPE_ICON } from '@/lib/catalog';
import { cn, formatDuration } from '@/lib/utils';
import type { CourseDetail, Enrollment, Lesson } from '@/types';

export default function LearnPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const t = useTranslations('learn');
  const tc = useTranslations('common');
  const { data: course, isPending: courseLoading } = useCourse(slug, { freshOnMount: true });
  const { data: enrollment, isPending: enrLoading } = useEnrollment(slug);
  const { onNet } = useNetworkMode();

  if (courseLoading || enrLoading) return <LoadingState label={tc('loading')} />;
  if (!course) {
    return <EmptyState icon={Lock} title={t('courseUnavailable')} />;
  }
  if (course.internalOnly && !onNet) {
    return (
      <EmptyState
        icon={Lock}
        title={t('internalLockedTitle')}
        description={t('internalLockedHint')}
        action={
          <Link href={`/catalog/${slug}`}>
            <Button variant="secondary">{t('goToCourse')}</Button>
          </Link>
        }
      />
    );
  }
  if (!enrollment) {
    return (
      <EmptyState
        icon={Lock}
        title={t('notEnrolledTitle')}
        description={t('notEnrolledHint')}
        action={
          <Link href={`/catalog/${slug}`}>
            <Button>{t('goToCourse')}</Button>
          </Link>
        }
      />
    );
  }

  return <Workspace course={course} enrollment={enrollment} slug={slug} />;
}

function Workspace({
  course,
  enrollment,
  slug,
}: {
  course: CourseDetail;
  enrollment: Enrollment;
  slug: string;
}) {
  const t = useTranslations('learn');
  const save = useSaveLessonProgress(slug);

  const lessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules]);
  const progressByLesson = useMemo(
    () => new Map(enrollment.lessonProgress.map((p) => [p.lessonId, p])),
    [enrollment.lessonProgress],
  );

  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);

  useEffect(() => {
    if (currentLessonId || openQuizId || !lessons.length) return;
    const resume =
      enrollment.lastLessonId && lessons.some((l) => l.id === enrollment.lastLessonId)
        ? enrollment.lastLessonId
        : lessons[0].id;
    setCurrentLessonId(resume);
  }, [lessons, enrollment.lastLessonId, currentLessonId, openQuizId]);

  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = currentIndex >= 0 ? lessons[currentIndex] : null;
  const currentProgress = currentLesson ? progressByLesson.get(currentLesson.id) : undefined;

  const selectLesson = (id: string) => {
    setOpenQuizId(null);
    setCurrentLessonId(id);
  };
  const selectQuiz = (id: string) => {
    setCurrentLessonId(null);
    setOpenQuizId(id);
  };

  const markComplete = (lesson: Lesson, advance: boolean) => {
    save.mutate({ lessonId: lesson.id, input: { completed: true } });
    if (advance && currentIndex >= 0 && currentIndex < lessons.length - 1) {
      setCurrentLessonId(lessons[currentIndex + 1].id);
    }
  };

  const isComplete = enrollment.status === 'completed';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/catalog/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t('backToCourse')}
        </Link>
        <span className="text-sm font-semibold text-primary">
          {t('percentComplete', { percent: enrollment.progress })}
        </span>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{course.title}</h1>
      <ProgressBar percent={enrollment.progress} />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="lg:order-2">
          <Card>
            <CardBody className="space-y-4">
              {course.modules.map((module, mi) => (
                <div key={module.id}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                    {mi + 1}. {module.title}
                  </p>
                  <ul className="space-y-1">
                    {module.lessons.map((lesson) => {
                      const done = progressByLesson.get(lesson.id)?.completed;
                      const active = lesson.id === currentLessonId;
                      const Icon = CONTENT_TYPE_ICON[lesson.type];
                      return (
                        <li key={lesson.id}>
                          <button
                            onClick={() => selectLesson(lesson.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors',
                              active ? 'bg-primary-50 text-primary-800' : 'hover:bg-slate-50 text-ink',
                            )}
                          >
                            <span
                              className={cn(
                                'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                                done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
                              )}
                            >
                              {done ? <Check size={13} /> : <Icon size={13} />}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                            <span className="shrink-0 text-xs text-muted">
                              {formatDuration(lesson.durationMinutes)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {course.quizzes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                    {t('assessment')}
                  </p>
                  <ul className="space-y-1">
                    {course.quizzes.map((quiz) => {
                      const active = quiz.id === openQuizId;
                      return (
                        <li key={quiz.id}>
                          <button
                            onClick={() => selectQuiz(quiz.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors',
                              active ? 'bg-primary-50 text-primary-800' : 'hover:bg-slate-50 text-ink',
                            )}
                          >
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600">
                              <CircleHelp size={13} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{quiz.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </aside>

        <div className="space-y-4 lg:order-1 lg:col-span-2">
          {isComplete && <CompletionBanner course={course} />}

          {openQuizId ? (
            <QuizPlayer
              quizId={openQuizId}
              courseSlug={slug}
              onClose={() => {
                setOpenQuizId(null);
                if (lessons.length) setCurrentLessonId(lessons[0].id);
              }}
            />
          ) : currentLesson ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="primary">{t(`format.${currentLesson.type}`)}</Badge>
                <h2 className="text-lg font-bold text-ink">{currentLesson.title}</h2>
              </div>
              <LessonViewer
                key={currentLesson.id}
                lesson={currentLesson}
                resumePosition={currentProgress?.resumePositionSeconds ?? 0}
                onProgress={(input) => save.mutate({ lessonId: currentLesson.id, input })}
                onEnded={() => markComplete(currentLesson, false)}
              />
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  disabled={currentIndex <= 0}
                  onClick={() => currentIndex > 0 && setCurrentLessonId(lessons[currentIndex - 1].id)}
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                  {t('previous')}
                </Button>
                {currentProgress?.completed ? (
                  currentIndex < lessons.length - 1 ? (
                    <Button onClick={() => setCurrentLessonId(lessons[currentIndex + 1].id)}>
                      {t('next')}
                      <ArrowRight size={16} className="rtl:rotate-180" />
                    </Button>
                  ) : course.quizzes.length > 0 ? (
                    <Button onClick={() => selectQuiz(course.quizzes[0].id)}>
                      <CircleHelp size={16} />
                      {t('goToQuiz')}
                    </Button>
                  ) : (
                    <Badge tone="success">
                      <Check size={13} />
                      {t('lessonDone')}
                    </Badge>
                  )
                ) : (
                  <Button onClick={() => markComplete(currentLesson, true)} loading={save.isPending}>
                    <Check size={16} />
                    {t('completeAndContinue')}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <LoadingState />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-gradient transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function CompletionBanner({ course }: { course: CourseDetail }) {
  const t = useTranslations('learn');
  const issuesCert = course.issuesCertificate ?? true;
  const { data: certificates, isLoading } = useCertificates();

  // Course explicitly issues no certificate → congratulate, but say so plainly
  // (Coursera/Udemy style) instead of promising a certificate that never exists.
  if (!issuesCert) {
    return (
      <Card className="overflow-hidden border border-emerald-200 bg-emerald-50">
        <CardBody className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p className="font-bold text-emerald-900">{t('courseCompleteTitle')}</p>
            <p className="text-sm text-emerald-800/80">{t('noCertificateHint')}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const cert = certificates?.find((c) => c.courseSlug === course.slug) ?? null;
  // Only say "pending" once the list has actually loaded and no cert was found —
  // otherwise an already-earned certificate flashes the pending copy while loading.
  const pending = !isLoading && !cert;

  return (
    <Card className="overflow-hidden border-0 bg-auth-panel text-white">
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Award size={22} />
          </span>
          <div>
            <p className="font-bold">{t('courseCompleteTitle')}</p>
            <p className="text-sm text-white/80">
              {pending ? t('certificatePendingHint') : t('courseCompleteHint')}
            </p>
          </div>
        </div>
        {cert && (
          <Link href="/certificates">
            <Button variant="secondary">{t('viewCertificate')}</Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
