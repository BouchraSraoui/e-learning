import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-primary-glow hover:bg-primary-700 active:bg-primary-800',
  secondary:
    'bg-white text-ink border border-line hover:bg-slate-50 active:bg-slate-100',
  ghost: 'text-ink hover:bg-slate-100 active:bg-slate-200',
  subtle: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}): string {
  const { variant = 'primary', size = 'md', className } = opts ?? {};
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold',
    'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClasses({
          variant,
          size,
          className: cn(fullWidth && 'w-full', className),
        })}
        {...props}
      >
        {loading && <Spinner size={size === 'lg' ? 20 : 18} />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
