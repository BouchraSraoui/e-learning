'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, hint, disabled, id, className }: SwitchProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {label && (
        <label htmlFor={fieldId} className="min-w-0 cursor-pointer">
          <span className="block text-sm font-medium text-slate-700">{label}</span>
          {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
        </label>
      )}
      <button
        type="button"
        role="switch"
        id={fieldId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-primary' : 'bg-slate-200',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
