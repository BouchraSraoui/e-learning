'use client';

import { ChevronDown } from 'lucide-react';
import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import { controlClasses, FieldShell } from './field';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, required, id, className, placeholder, options, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            aria-invalid={error ? true : undefined}
            className={cn('h-11 appearance-none pe-10', controlClasses(!!error), className)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute inset-y-0 end-3.5 my-auto text-slate-400"
          />
        </div>
      </FieldShell>
    );
  },
);
Select.displayName = 'Select';
