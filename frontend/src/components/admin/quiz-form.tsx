'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AdminQuiz, Module, QuestionType, QuizInput } from '@/types';

interface EditAnswer {
  text: string;
  isCorrect: boolean;
}
interface EditQuestion {
  text: string;
  type: QuestionType;
  points: number;
  answers: EditAnswer[];
}

const Q_TYPES: QuestionType[] = ['single', 'multiple', 'true_false', 'dropdown'];

function blankQuestion(): EditQuestion {
  return {
    text: '',
    type: 'single',
    points: 1,
    answers: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ],
  };
}

function fromQuiz(quiz: AdminQuiz): EditQuestion[] {
  return quiz.questions.map((q) => ({
    text: q.text,
    type: q.type,
    points: q.points,
    answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
  }));
}

export function QuizForm({
  courseId,
  modules,
  quiz,
  onSave,
  onCancel,
  saving,
}: {
  courseId: string;
  modules: Module[];
  quiz: AdminQuiz | null;
  onSave: (input: QuizInput) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tQ = useTranslations('quiz');

  const [title, setTitle] = useState(quiz?.title ?? '');
  const [description, setDescription] = useState(quiz?.description ?? '');
  const [passScore, setPassScore] = useState(quiz?.passScore ?? 70);
  const [published, setPublished] = useState(quiz?.published ?? true);
  const [scope, setScope] = useState<'course' | 'module'>(quiz?.scope ?? 'course');
  const [moduleId, setModuleId] = useState(quiz?.moduleId ?? '');
  const [questions, setQuestions] = useState<EditQuestion[]>(quiz ? fromQuiz(quiz) : [blankQuestion()]);
  const [error, setError] = useState<string | null>(null);

  function patchQuestion(qi: number, patch: Partial<EditQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }
  function patchAnswer(qi: number, ai: number, patch: Partial<EditAnswer>) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qi ? { ...q, answers: q.answers.map((a, j) => (j === ai ? { ...a, ...patch } : a)) } : q,
      ),
    );
  }
  function toggleCorrect(qi: number, ai: number) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi) return q;
        const single = q.type !== 'multiple';
        return {
          ...q,
          answers: q.answers.map((a, j) => ({
            ...a,
            isCorrect: single ? j === ai : j === ai ? !a.isCorrect : a.isCorrect,
          })),
        };
      }),
    );
  }

  function fail(msg: string): null {
    setError(msg);
    return null;
  }
  function validate(): QuizInput | null {
    if (!title.trim()) return fail(t('required'));
    if (scope === 'module' && !moduleId) return fail(t('pickModule'));
    for (const q of questions) {
      if (!q.text.trim()) return fail(t('questionTextRequired'));
      const answers = q.answers.filter((a) => a.text.trim());
      if (answers.length < 2) return fail(t('needTwoAnswers'));
      const correct = answers.filter((a) => a.isCorrect);
      if (correct.length < 1) return fail(t('needCorrectAnswer'));
      if ((q.type === 'single' || q.type === 'dropdown') && correct.length !== 1)
        return fail(t('singleOneCorrect'));
      if (q.type === 'true_false' && answers.length !== 2) return fail(t('trueFalseTwo'));
    }
    return {
      courseId: scope === 'course' ? courseId : null,
      moduleId: scope === 'module' ? moduleId : null,
      title: title.trim(),
      description,
      passScore: Number(passScore) || 0,
      maxAttempts: 0,
      published,
      questions: questions.map((q, qi) => ({
        text: q.text.trim(),
        type: q.type,
        points: Number(q.points) || 1,
        order: qi,
        answers: q.answers
          .filter((a) => a.text.trim())
          .map((a, ai) => ({ text: a.text.trim(), isCorrect: a.isCorrect, order: ai })),
      })),
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = validate();
    if (input) await onSave(input);
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-primary-200 bg-primary-50/20 p-4 sm:p-5"
    >
      <p className="text-sm font-bold text-ink">{quiz ? t('editQuiz') : t('newQuiz')}</p>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Input label={t('quizTitle')} required value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input label={t('description')} value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          type="number"
          min={0}
          max={100}
          label={t('passScore')}
          value={passScore}
          onChange={(e) => setPassScore(Number(e.target.value))}
        />
        <Select
          label={t('quizScope')}
          value={scope}
          onChange={(e) => setScope(e.target.value as 'course' | 'module')}
          options={[
            { value: 'course', label: t('scopeCourse') },
            { value: 'module', label: t('scopeModule') },
          ]}
        />
      </div>

      {scope === 'module' && (
        <Select
          label={t('module')}
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          placeholder={t('pickModule')}
          options={modules.map((m) => ({ value: m.id, label: m.title }))}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">{t('questions')}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
          >
            <Plus size={15} />
            {t('addQuestion')}
          </Button>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="space-y-3 rounded-xl border border-line bg-white p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 text-xs font-bold text-muted">{qi + 1}.</span>
              <div className="flex-1">
                <Input
                  value={q.text}
                  onChange={(e) => patchQuestion(qi, { text: e.target.value })}
                  placeholder={t('questionPlaceholder')}
                />
              </div>
              <button
                type="button"
                onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
                className="mt-1 grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={tc('delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={q.type}
                onChange={(e) => patchQuestion(qi, { type: e.target.value as QuestionType })}
                options={Q_TYPES.map((ty) => ({ value: ty, label: t(`qtype_${ty}` as never) }))}
              />
              <Input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) => patchQuestion(qi, { points: Number(e.target.value) })}
                placeholder={t('points')}
              />
            </div>

            <div className="space-y-2">
              {q.answers.map((a, ai) => (
                <div key={ai} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(qi, ai)}
                    title={t('markCorrect')}
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors',
                      a.isCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-line bg-white text-transparent hover:border-emerald-300',
                    )}
                  >
                    <Check size={15} />
                  </button>
                  <input
                    value={a.text}
                    onChange={(e) => patchAnswer(qi, ai, { text: e.target.value })}
                    placeholder={t('answerPlaceholder')}
                    className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => patchQuestion(qi, { answers: q.answers.filter((_, j) => j !== ai) })}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={tc('remove')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchQuestion(qi, { answers: [...q.answers, { text: '', isCorrect: false }] })
                }
                className="text-xs font-semibold text-primary hover:text-primary-700"
              >
                + {t('addAnswer')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Checkbox label={t('published')} checked={published} onChange={(e) => setPublished(e.target.checked)} />
      <p className="text-xs text-muted">{tQ('passMark', { score: passScore })}</p>

      <div className="flex justify-end gap-3 border-t border-line pt-4">
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
