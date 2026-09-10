'use client';

import {
  ArrowLeft,
  Eye,
  FileText,
  GripVertical,
  ListChecks,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AssignCourseModal } from '@/components/admin/assign-course-modal';
import { CourseDetailsForm } from '@/components/admin/course-details-form';
import { LessonForm } from '@/components/admin/lesson-form';
import { QuizForm } from '@/components/admin/quiz-form';
import { RoleGuard } from '@/components/app/role-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdminCourse, useBuilderActions, useCourseQuizzes } from '@/hooks/use-authoring';
import type { AdminQuiz, Lesson, LessonInput, Module, QuizInput, ResourceInput } from '@/types';

function BuilderInner() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tFormats = useTranslations('formats');
  const toast = useToast();

  const { data: course, isPending, isError, refetch } = useAdminCourse(slug);
  const courseId = course?.id ?? '';
  const { data: quizzes } = useCourseQuizzes(courseId);
  const actions = useBuilderActions(slug, courseId);

  const [moduleModal, setModuleModal] = useState<{ open: boolean; editing: Module | null }>({ open: false, editing: null });
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonForm, setLessonForm] = useState<{ moduleId: string; lesson: Lesson | null } | null>(null);
  const [resourceModal, setResourceModal] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resFile, setResFile] = useState<File | null>(null);
  const [quizForm, setQuizForm] = useState<{ quiz: AdminQuiz | null } | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; run: () => Promise<void> } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  if (isError) return <ErrorState title={t('loadErrorCourse')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  if (isPending || !course) return <LoadingState label={tc('loading')} />;

  async function saveModule() {
    if (!moduleTitle.trim()) return;
    try {
      if (moduleModal.editing) {
        await actions.updateModule.mutateAsync({ id: moduleModal.editing.id, input: { title: moduleTitle.trim() } });
      } else {
        await actions.createModule.mutateAsync({ courseId, title: moduleTitle.trim(), order: course!.modules.length });
      }
      toast.success(t('saved'));
      setModuleModal({ open: false, editing: null });
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  async function saveLesson(input: LessonInput) {
    const editing = lessonForm?.lesson ?? null;
    try {
      if (editing) await actions.updateLesson.mutateAsync({ id: editing.id, input });
      else await actions.createLesson.mutateAsync(input);
      toast.success(t('saved'));
      setLessonForm(null);
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  async function saveResource() {
    if (!resTitle.trim() || (!resUrl.trim() && !resFile)) {
      toast.error(t('resourceNeedsSource'));
      return;
    }
    const input: ResourceInput = { courseId, title: resTitle.trim(), externalUrl: resUrl.trim(), file: resFile };
    try {
      await actions.createResource.mutateAsync(input);
      toast.success(t('saved'));
      setResourceModal(false);
      setResTitle('');
      setResUrl('');
      setResFile(null);
    } catch {
      toast.error(t('saveFailed'));
    }
  }

  async function saveQuiz(input: QuizInput) {
    const editing = quizForm?.quiz ?? null;
    try {
      if (editing) await actions.updateQuiz.mutateAsync({ id: editing.id, input });
      else await actions.createQuiz.mutateAsync(input);
      toast.success(t('saved'));
      setQuizForm(null);
    } catch {
      toast.error(t('quizSaveFailed'));
    }
  }

  function askDelete(message: string, run: () => Promise<void>) {
    setConfirm({ open: true, message, run });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft size={16} />
          {t('backToCourses')}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{course.title}</h2>
          <Badge tone={course.published ? 'success' : 'warning'}>
            {course.published ? t('published') : t('draft')}
          </Badge>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <UserPlus size={16} />
              {t('assignToUser')}
            </button>
            <Link
              href={`/catalog/${course.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary"
            >
              <Eye size={16} />
              {t('previewCourse')}
            </Link>
          </div>
        </div>
        <p className="mt-1 text-muted">{course.summary}</p>
      </div>

      <CourseDetailsForm course={course} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{t('chapters')}</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setModuleTitle('');
              setModuleModal({ open: true, editing: null });
            }}
          >
            <Plus size={16} />
            {t('addChapter')}
          </Button>
        </div>

        {course.modules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white/50 px-4 py-8 text-center text-sm text-muted">
            {t('noChapters')}
          </p>
        ) : (
          course.modules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-line bg-white">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <GripVertical size={16} className="text-slate-300" />
                <p className="flex-1 font-semibold text-ink">{m.title}</p>
                <span className="text-xs text-muted">{t('lessonsCount', { count: m.lessons.length })}</span>
                <button
                  onClick={() => {
                    setModuleTitle(m.title);
                    setModuleModal({ open: true, editing: m });
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                  aria-label={tc('edit')}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() =>
                    askDelete(t('deleteChapterConfirm', { title: m.title }), async () => {
                      await actions.deleteModule.mutateAsync(m.id);
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={tc('delete')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <ul className="divide-y divide-line">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <FileText size={16} className="text-slate-400" />
                    <span className="flex-1 truncate text-sm text-slate-700">{l.title}</span>
                    {l.isPreview && <Badge tone="brand">{t('previewBadge')}</Badge>}
                    <Badge tone="neutral">{tFormats(l.type)}</Badge>
                    <button
                      onClick={() => setLessonForm({ moduleId: m.id, lesson: l })}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                      aria-label={tc('edit')}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() =>
                        askDelete(t('deleteLessonConfirm', { title: l.title }), async () => {
                          await actions.deleteLesson.mutateAsync(l.id);
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={tc('delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
              {lessonForm?.moduleId === m.id ? (
                <div className="px-4 pb-4 pt-3">
                  <LessonForm
                    key={lessonForm.lesson?.id ?? 'new'}
                    moduleId={m.id}
                    lesson={lessonForm.lesson}
                    defaultOrder={m.lessons.length}
                    onSave={saveLesson}
                    onCancel={() => setLessonForm(null)}
                    saving={actions.createLesson.isPending || actions.updateLesson.isPending}
                  />
                </div>
              ) : (
                <div className="px-4 py-2.5">
                  <button
                    onClick={() => setLessonForm({ moduleId: m.id, lesson: null })}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-700"
                  >
                    <Plus size={15} />
                    {t('addLesson')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{t('resources')}</h3>
          <Button variant="secondary" size="sm" onClick={() => setResourceModal(true)}>
            <Plus size={16} />
            {t('addResource')}
          </Button>
        </div>
        {course.resources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white/50 px-4 py-6 text-center text-sm text-muted">
            {t('noResources')}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {course.resources.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Paperclip size={16} className="text-slate-400" />
                <span className="flex-1 truncate text-sm text-slate-700">{r.title}</span>
                <button
                  onClick={() =>
                    askDelete(t('deleteResourceConfirm', { title: r.title }), async () => {
                      await actions.deleteResource.mutateAsync(r.id);
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={tc('delete')}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{t('quizzes')}</h3>
          {!quizForm && (
            <Button variant="secondary" size="sm" onClick={() => setQuizForm({ quiz: null })}>
              <Plus size={16} />
              {t('addQuiz')}
            </Button>
          )}
        </div>
        {(!quizzes || quizzes.length === 0) && !quizForm ? (
          <p className="rounded-xl border border-dashed border-line bg-white/50 px-4 py-6 text-center text-sm text-muted">
            {t('noQuizzes')}
          </p>
        ) : (
          quizzes &&
          quizzes.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {quizzes.map((q) => (
                <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                  <ListChecks size={16} className="text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{q.title}</p>
                    <p className="text-xs text-muted">
                      {t(q.scope === 'module' ? 'scopeModule' : 'scopeCourse')} ·{' '}
                      {t('questionsCount', { count: q.questionCount })}
                    </p>
                  </div>
                  {!q.published && <Badge tone="warning">{t('draft')}</Badge>}
                  <button
                    onClick={() => setQuizForm({ quiz: q })}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary"
                    aria-label={tc('edit')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() =>
                      askDelete(t('deleteQuizConfirm', { title: q.title }), async () => {
                        await actions.deleteQuiz.mutateAsync(q.id);
                      })
                    }
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={tc('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
        {quizForm && (
          <QuizForm
            key={quizForm.quiz?.id ?? 'new'}
            courseId={courseId}
            modules={course.modules}
            quiz={quizForm.quiz}
            onSave={saveQuiz}
            onCancel={() => setQuizForm(null)}
            saving={actions.createQuiz.isPending || actions.updateQuiz.isPending}
          />
        )}
      </section>

      <Modal
        open={moduleModal.open}
        onClose={() => setModuleModal({ open: false, editing: null })}
        title={moduleModal.editing ? t('editChapter') : t('addChapter')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModuleModal({ open: false, editing: null })}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveModule} loading={actions.createModule.isPending || actions.updateModule.isPending}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <Input label={t('chapterTitle')} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} autoFocus />
      </Modal>

      <Modal
        open={resourceModal}
        onClose={() => setResourceModal(false)}
        title={t('addResource')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResourceModal(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={saveResource} loading={actions.createResource.isPending}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('resourceTitle')} value={resTitle} onChange={(e) => setResTitle(e.target.value)} />
          <Input
            label={t('externalUrl')}
            value={resUrl}
            onChange={(e) => setResUrl(e.target.value)}
            placeholder="https://…"
            hint={t('resourceSourceHint')}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">{t('uploadFile')}</p>
            <input
              type="file"
              onChange={(e) => setResFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirm?.open)}
        onClose={() => setConfirm(null)}
        title={t('confirmDeleteTitle')}
        description={confirm?.message}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm) return;
                try {
                  await confirm.run();
                  toast.success(t('deleted'));
                } catch {
                  toast.error(t('saveFailed'));
                }
                setConfirm(null);
              }}
            >
              {tc('delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('actionIrreversible')}</p>
      </Modal>

      <AssignCourseModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        presetCourseId={course.id}
        presetCourseTitle={course.title}
      />
    </div>
  );
}

export default function CourseBuilderPage() {
  return (
    <RoleGuard roles={['admin', 'manager']}>
      <BuilderInner />
    </RoleGuard>
  );
}
