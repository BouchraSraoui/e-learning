import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'brand' | 'success' | 'warning' | 'danger' | 'violet';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-50 text-primary-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
