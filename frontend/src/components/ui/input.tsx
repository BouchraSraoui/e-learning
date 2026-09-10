'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { controlClasses, FieldShell } from './field';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelAddon?: React.ReactNode;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelAddon, hint, error, required, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        labelAddon={labelAddon}
        hint={hint}
        error={error}
        required={required}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn('h-11', controlClasses(!!error), className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
Input.displayName = 'Input';

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelAddon, hint, error, required, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const [visible, setVisible] = useState(false);
    return (
      <FieldShell
        id={fieldId}
        label={label}
        labelAddon={labelAddon}
        hint={hint}
        error={error}
        required={required}
      >
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            className={cn('h-11 pe-11', controlClasses(!!error), className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </FieldShell>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, id, className, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn('min-h-[96px] resize-y py-2.5', controlClasses(!!error), className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
Textarea.displayName = 'Textarea';
