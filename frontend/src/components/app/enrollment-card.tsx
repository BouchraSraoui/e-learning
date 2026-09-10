'use client';

import { Play, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { accentTone, levelTone } from '@/lib/catalog';
import type { Enrollment } from '@/types';

export function EnrollmentCard({ enrollment: e }: { enrollment: Enrollment }) {
  const t = useTranslations('myLearning');
  const tl = useTranslations('levels');
  const tc = useTranslations('catalog');
  const label =
    e.status === 'not_started' ? t('start') : e.status === 'completed' ? t('review') : t('resume');

  return (
    <Card>
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {e.course.categoryName && (
            <Badge tone={accentTone(e.course.categoryAccent)}>{e.course.categoryName}</Badge>
          )}
          <Badge tone={levelTone(e.course.level)}>{tl(e.course.level)}</Badge>
          {e.course.mandatory && (
            <Badge tone="danger">
              <Star size={12} />
              {tc('mandatory')}
            </Badge>
          )}
          {e.status === 'completed' && <Badge tone="success">{t('completed')}</Badge>}
        </div>
        <h3 className="font-bold text-ink">{e.course.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{e.course.summary}</p>

        <div className="mt-auto space-y-2 pt-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              style={{ width: `${e.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{t('percent', { percent: e.progress })}</span>
            <Link href={`/learn/${e.course.slug}`}>
              <Button size="sm" variant={e.status === 'completed' ? 'secondary' : 'primary'}>
                <Play size={15} />
                {label}
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
