import { cn } from '@/lib/utils';

export function FieldShell({
  id,
  label,
  labelAddon,
  hint,
  error,
  required,
  className,
  children,
}: {
  id?: string;
  label?: string;
  labelAddon?: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || labelAddon) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-slate-700">
              {label}
              {required && <span className="text-rose-500"> *</span>}
            </label>
          )}
          {labelAddon}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function controlClasses(error?: boolean): string {
  return cn(
    'w-full rounded-xl border bg-white px-3.5 text-sm text-ink shadow-sm transition-colors',
    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50',
    error
      ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/40'
      : 'border-line focus:border-primary-400',
  );
}
