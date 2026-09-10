import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Spinner } from './spinner';

export function LoadingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('grid place-items-center gap-3 py-16 text-muted', className)}
      role="status"
    >
      <Spinner size={28} className="text-primary" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-white/50 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={24} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid place-items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-500">
        <CircleAlert size={24} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
