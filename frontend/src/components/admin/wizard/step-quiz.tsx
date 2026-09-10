'use client';

import { Check, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types';
import {
  type DraftQuestion,
  type DraftQuiz,
  blankOption,
  blankQuestion,
  totalPoints,
} from './wizard-types';

const Q_TYPES: QuestionType[] = ['single', 'multiple', 'true_false', 'dropdown'];

export function StepQuiz({
  quiz,
  setQuiz,
}: {
  quiz: DraftQuiz;
  setQuiz: (updater: (quiz: DraftQuiz) => DraftQuiz) => void;
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');

  const patch = (p: Partial<DraftQuiz>) => setQuiz((q) => ({ ...q, ...p }));
  const setQuestions = (updater: (qs: DraftQuestion[]) => DraftQuestion[]) =>
    setQuiz((q) => ({ ...q, questions: updater(q.questions) }));

  const patchQuestion = (id: string, p: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const toggleCorrect = (questionId: string, optionId: string) =>
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== questionId) return q;
        const single = q.type !== 'multiple';
        return {
          ...q,
          options: q.options.map((o) => ({
            ...o,
            correct: single ? o.id === optionId : o.id === optionId ? !o.correct : o.correct,
          })),
        };
      }),
    );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t('quiz')}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {t('quizSummary', {
              questions: quiz.questions.length,
              points: totalPoints(quiz.questions),
              score: quiz.passScore,
            })}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {quiz.questions.map((question, qi) => {
            const multiple = question.type === 'multiple';
            return (
              <div key={question.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-50 text-xs font-bold text-primary">
                    {qi + 1}
                  </span>
                  <div className="w-40 shrink-0">
                    <Select
                      value={question.type}
                      onChange={(e) =>
                        patchQuestion(question.id, { type: e.target.value as QuestionType })
                      }
                      options={Q_TYPES.map((ty) => ({ value: ty, label: t(`qtype_${ty}` as never) }))}
                    />
                  </div>
                  <div className="ms-auto flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={question.points}
                      onChange={(e) => patchQuestion(question.id, { points: Number(e.target.value) })}
                      className="h-9 w-14 rounded-lg border border-line bg-white px-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                    <span className="text-xs text-muted">{t('pts')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestions((qs) => qs.filter((q) => q.id !== question.id))}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={tc('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3">
                  <Textarea
                    value={question.text}
                    onChange={(e) => patchQuestion(question.id, { text: e.target.value })}
                    rows={2}
                    placeholder={t('questionPlaceholder')}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors',
                        option.correct ? 'border-emerald-200 bg-emerald-50/60' : 'border-line bg-white',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCorrect(question.id, option.id)}
                        title={t('markCorrect')}
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center border transition-colors',
                          multiple ? 'rounded-md' : 'rounded-full',
                          option.correct
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white text-transparent hover:border-emerald-400',
                        )}
                      >
                        <Check size={14} />
                      </button>
                      <input
                        value={option.text}
                        onChange={(e) =>
                          patchQuestion(question.id, {
                            options: question.options.map((o) =>
                              o.id === option.id ? { ...o, text: e.target.value } : o,
                            ),
                          })
                        }
                        placeholder={t('answerPlaceholder')}
                        className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none"
                      />
                      {option.correct && (
                        <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {t('correctTag')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          patchQuestion(question.id, {
                            options: question.options.filter((o) => o.id !== option.id),
                          })
                        }
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={tc('remove')}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patchQuestion(question.id, { options: [...question.options, blankOption(false)] })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:text-primary-700"
                  >
                    <Plus size={15} />
                    {t('addOption')}
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/60 px-4 py-3.5 text-sm font-semibold text-primary hover:border-primary-300 hover:bg-primary-50/40"
          >
            <Plus size={16} />
            {t('addQuestion')}
          </button>
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-6">
        <h3 className="text-base font-bold text-ink">{t('quizSettings')}</h3>
        <div className="mt-5 space-y-5">
          <Input
            type="number"
            min={0}
            max={100}
            label={t('passingScore')}
            hint={t('percentToPass')}
            value={quiz.passScore}
            onChange={(e) => patch({ passScore: Number(e.target.value) })}
          />
          <Switch
            label={t('shuffleQuestions')}
            hint={t('shuffleQuestionsHint')}
            checked={quiz.shuffleQuestions}
            onChange={(v) => patch({ shuffleQuestions: v })}
          />
          <Switch
            label={t('revealAnswers')}
            hint={t('revealAnswersHint')}
            checked={quiz.revealAnswers}
            onChange={(v) => patch({ revealAnswers: v })}
          />
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm font-semibold text-ink">{t('totalPoints')}</span>
            <span className="text-sm font-bold text-ink">{totalPoints(quiz.questions)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
