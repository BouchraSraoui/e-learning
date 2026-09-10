'use client';

import {
  Award,
  CirclePlay,
  Flame,
  Footprints,
  GraduationCap,
  Lock,
  Medal,
  MessagesSquare,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardBody } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/states';
import { useBadges } from '@/hooks/use-gamification';
import { cn } from '@/lib/utils';
import type { Accent, Badge } from '@/types';

const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  'circle-play': CirclePlay,
  'graduation-cap': GraduationCap,
  award: Award,
  target: Target,
  medal: Medal,
  flame: Flame,
  'messages-square': MessagesSquare,
};

const ACCENT: Record<Accent, string> = {
  primary: 'bg-primary-50 text-primary-600',
  brand: 'bg-cyan-50 text-cyan-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

export default function BadgesPage() {
  const t = useTranslations('badges');
  const tc = useTranslations('common');
  const { data: badges, isPending } = useBadges();

  if (isPending || !badges) return <LoadingState label={tc('loading')} />;

  const earned = badges.filter((b) => b.earned);
  const points = earned.reduce((s, b) => s + b.points, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Medal size={24} />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink">
                {earned.length}
                <span className="text-base font-semibold text-muted">/{badges.length}</span>
              </p>
              <p className="text-sm text-muted">{t('earnedLabel')}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Award size={24} />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink">{points}</p>
              <p className="text-sm text-muted">{t('pointsLabel')}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const t = useTranslations('badges');
  const Icon = ICONS[badge.icon] ?? Award;
  return (
    <Card className={cn('transition-shadow', !badge.earned && 'opacity-70')}>
      <CardBody className="flex items-start gap-4">
        <span
          className={cn(
            'grid h-14 w-14 shrink-0 place-items-center rounded-2xl',
            badge.earned ? ACCENT[badge.accent] : 'bg-slate-100 text-slate-400',
          )}
        >
          {badge.earned ? <Icon size={26} /> : <Lock size={22} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{badge.name}</p>
          <p className="mt-0.5 text-xs text-muted">{badge.description}</p>
          <p className="mt-2 text-xs font-semibold text-primary">
            {t('points', { count: badge.points })}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
