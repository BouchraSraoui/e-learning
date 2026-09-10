'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useCourseFeedback, useSubmitFeedback } from '@/hooks/use-feedback';
import { cn } from '@/lib/utils';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </div>
  );
}

export function CourseFeedback({ courseSlug }: { courseSlug: string }) {
  const t = useTranslations('feedback');
  const toast = useToast();
  const { data } = useCourseFeedback(courseSlug);
  const submit = useSubmitFeedback(courseSlug);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (data?.mine) {
      setRating(data.mine.rating);
      setComment(data.mine.comment);
    }
  }, [data?.mine]);

  const onSubmit = () => {
    if (!rating) return;
    submit.mutate({ rating, comment }, { onSuccess: () => toast.success(t('thanks')) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-4xl font-extrabold text-ink">
          {data && data.count > 0 ? data.average.toFixed(1) : '—'}
        </div>
        <div>
          <Stars value={Math.round(data?.average ?? 0)} />
          <p className="mt-0.5 text-xs text-muted">{t('count', { count: data?.count ?? 0 })}</p>
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="mb-2 text-sm font-semibold text-ink">
          {data?.mine ? t('yourRating') : t('rateThis')}
        </p>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              aria-label={`${n}`}
            >
              <Star
                size={26}
                className={cn(
                  'transition-colors',
                  (hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                )}
              />
            </button>
          ))}
        </div>
        <Textarea
          className="mt-3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('placeholder')}
          rows={2}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={onSubmit} loading={submit.isPending} disabled={!rating}>
            {t('submit')}
          </Button>
        </div>
      </div>

      {data && data.results.length > 0 && (
        <ul className="space-y-3">
          {data.results.map((f) => (
            <li key={f.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{f.authorName}</span>
                <Stars value={f.rating} size={14} />
              </div>
              {f.comment && <p className="mt-1 text-sm text-slate-600">{f.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
