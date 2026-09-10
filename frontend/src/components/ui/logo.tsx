import { cn } from '@/lib/utils';

const WORDMARK_H = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-7',
  xl: 'h-9',
} as const;

const SUB_SIZE = {
  sm: 'text-[8px]',
  md: 'text-[9px]',
  lg: 'text-[10px]',
  xl: 'text-[11px]',
} as const;

export function Logo({
  size = 'md',
  variant = 'default',
  subtitle = true,
  className,
}: {
  size?: keyof typeof WORDMARK_H;
  variant?: 'default' | 'light';
  subtitle?: boolean;
  className?: string;
}) {
  const light = variant === 'light';
  return (
    <span className={cn('inline-flex flex-col items-start leading-none', className)}>
      <img
        src="/icosnet-wordmark.png"
        alt="Icosnet"
        className={cn('w-auto', WORDMARK_H[size], light && 'brightness-0 invert')}
      />
      {subtitle && (
        <span
          className={cn(
            'mt-1.5 font-semibold uppercase tracking-[0.25em]',
            SUB_SIZE[size],
            light ? 'text-white/70' : 'text-slate-400',
          )}
        >
          Training Platform
        </span>
      )}
    </span>
  );
}
