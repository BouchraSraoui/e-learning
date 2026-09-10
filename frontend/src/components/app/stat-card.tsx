import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'emerald' | 'violet' | 'amber' | 'brand';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  brand: 'bg-brand-50 text-brand-600',
};

export function StatCard({
  icon: Icon,
  tone = 'primary',
  value,
  label,
  delta,
}: {
  icon: LucideIcon;
  tone?: Tone;
  value: React.ReactNode;
  label: string;
  delta?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className={cn('grid h-11 w-11 place-items-center rounded-xl', TONES[tone])}>
          <Icon size={20} />
        </span>
        {delta && (
          <span className="text-xs font-semibold text-emerald-600">{delta}</span>
        )}
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </Card>
  );
}
