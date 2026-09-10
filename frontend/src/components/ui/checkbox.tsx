'use client';

import { Check } from 'lucide-react';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <label htmlFor={fieldId} className="inline-flex cursor-pointer items-center gap-2.5">
        <span className="relative inline-grid h-5 w-5 place-items-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            className={cn(
              'peer h-5 w-5 appearance-none rounded-md border border-line bg-white',
              'checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50',
              'transition-colors',
              className,
            )}
            {...props}
          />
          <Check
            size={14}
            strokeWidth={3}
            className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        {label && <span className="text-sm text-slate-700">{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
