'use client';

import { Award, CircleCheck, CircleX, Lock, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useQuiz, useSubmitAttempt } from '@/hooks/use-quiz';
import { cn } from '@/lib/utils';
import type { Quiz, QuizAttemptResult, QuizQuestion, QuizResponses } from '@/types';

export function QuizPlayer({
  quizId,
  courseSlug,
  onClose,
  onPassed,
}: {
  quizId: string;
  courseSlug: string | null;
  onClose: () => void;
  onPassed?: () => void;
}) {
  const t = useTranslations('quiz');
  const tc = useTranslations('common');
  const toast = useToast();
  const { data: quiz, isPending, error, refetch } = useQuiz(quizId);
  const submit = useSubmitAttempt(quizId, courseSlug);
  const [answers, setAnswers] = useState<QuizResponses>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  if (isPending) return <LoadingState label={tc('loading')} />;
  if (!quiz) {
    return <ErrorState title={t('loadError')} onRetry={() => refetch()} retryLabel={tc('retry')} />;
  }

  if (result) {
    return (
      <QuizResult
        quiz={quiz}
        result={result}
        onRetake={() => {
          setResult(null);
          setAnswers({});
        }}
        onClose={onClose}
      />
    );
  }

  if (quiz.attemptsLeft === 0) {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden border-0 bg-rose-50">
          <CardBody className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <Lock size={26} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-ink">{quiz.title}</p>
              <p className="mt-0.5 text-sm text-rose-700">{t('noAttemptsLeft')}</p>
            </div>
          </CardBody>
        </Card>
        <Button variant="ghost" onClick={onClose}>
          {t('backToLessons')}
        </Button>
      </div>
    );
  }

  const toggle = (q: QuizQuestion, answerId: number) => {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      if (q.type === 'multiple') {
        const next = current.includes(answerId)
          ? current.filter((a) => a !== answerId)
          : [...current, answerId];
        return { ...prev, [q.id]: next };
      }
      return { ...prev, [q.id]: [answerId] };
    });
  };

  const answeredAll = quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  const onSubmit = async () => {
    try {
      const res = await submit.mutateAsync(answers);
      setResult(res);
      if (res.passed) onPassed?.();
    } catch (err) {
      const e = err as { response?: { data?: { code?: string } } };
      if (e.response?.data?.code === 'no_attempts_left') {
        toast.error(t('noAttemptsLeft'));
        refetch();
      } else {
        toast.error(t('submitError'));
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{quiz.title}</h2>
        {quiz.description && <p className="mt-1 text-sm text-muted">{quiz.description}</p>}
        <p className="mt-1 text-xs text-muted">
          {t('passMark', { score: quiz.passScore })}
          {quiz.attemptsLeft !== null && quiz.attemptsLeft !== undefined && (
            <> · {t('attemptsLeftCount', { count: quiz.attemptsLeft })}</>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <Card key={q.id}>
            <CardBody>
              <div className="flex items-start gap-2">
                <span className="text-sm font-bold text-muted">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{q.text}</p>
                  {q.type === 'multiple' && (
                    <p className="mt-0.5 text-xs text-muted">{t('selectAll')}</p>
                  )}
                  {q.type === 'dropdown' ? (
                    <div className="mt-3">
                      <Select
                        aria-label={q.text}
                        placeholder={t('choose')}
                        value={(answers[q.id] ?? [])[0]?.toString() ?? ''}
                        onChange={(e) => toggle(q, Number(e.target.value))}
                        options={q.answers.map((a) => ({ value: a.id, label: a.text }))}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {q.answers.map((a) => {
                        const checked = (answers[q.id] ?? []).includes(Number(a.id));
                        return (
                          <label
                            key={a.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                              checked
                                ? 'border-primary-300 bg-primary-50/60 text-ink'
                                : 'border-line hover:bg-slate-50',
                            )}
                          >
                            <input
                              type={q.type === 'multiple' ? 'checkbox' : 'radio'}
                              name={`q-${q.id}`}
                              checked={checked}
                              onChange={() => toggle(q, Number(a.id))}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>{a.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t('backToLessons')}
        </Button>
        <Button onClick={onSubmit} disabled={!answeredAll} loading={submit.isPending}>
          {t('submit')}
        </Button>
      </div>
    </div>
  );
}

function QuizResult({
  quiz,
  result,
  onRetake,
  onClose,
}: {
  quiz: Quiz;
  result: QuizAttemptResult;
  onRetake: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('quiz');
  const review = result.review ?? [];
  const canRetake = quiz.maxAttempts === 0 || (quiz.attemptsLeft ?? 1) > 0;

  return (
    <div className="space-y-5">
      <Card className={cn('overflow-hidden border-0', result.passed ? 'bg-emerald-50' : 'bg-rose-50')}>
        <CardBody className="flex items-center gap-4">
          <span
            className={cn(
              'grid h-14 w-14 shrink-0 place-items-center rounded-2xl',
              result.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600',
            )}
          >
            {result.passed ? <Award size={28} /> : <CircleX size={28} />}
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-ink">{result.score}%</p>
            <p className={cn('text-sm font-semibold', result.passed ? 'text-emerald-700' : 'text-rose-700')}>
              {result.passed ? t('passed') : t('failed', { score: quiz.passScore })}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {quiz.questions.map((q, i) => {
          const r = review.find((x) => x.questionId === q.id);
          return (
            <Card key={q.id}>
              <CardBody>
                <div className="flex items-start gap-2">
                  {r?.correct ? (
                    <CircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <CircleX size={18} className="mt-0.5 shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      <span className="text-muted">{i + 1}. </span>
                      {q.text}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {q.answers.map((a) => {
                        const isCorrect = r?.correctAnswerIds.includes(a.id);
                        const wasChosen = r?.selectedAnswerIds.includes(a.id);
                        return (
                          <li
                            key={a.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1',
                              isCorrect && 'bg-emerald-50 text-emerald-800',
                              !isCorrect && wasChosen && 'bg-rose-50 text-rose-800 line-through',
                              !isCorrect && !wasChosen && 'text-muted',
                            )}
                          >
                            {a.text}
                            {isCorrect && <CircleCheck size={13} className="text-emerald-600" />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t('backToLessons')}
        </Button>
        {!result.passed && canRetake && (
          <Button onClick={onRetake}>
            <RotateCcw size={16} />
            {t('retake')}
          </Button>
        )}
      </div>
    </div>
  );
}
