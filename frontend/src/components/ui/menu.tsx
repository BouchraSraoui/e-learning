'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function Dropdown({
  trigger,
  children,
  align = 'end',
  menuClassName,
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';
  menuClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-2 min-w-[200px] animate-scale-in rounded-xl border border-line bg-white p-1.5 shadow-pop',
            align === 'end' ? 'end-0' : 'start-0',
            menuClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  className,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium text-slate-700',
        'hover:bg-slate-100',
        active && 'bg-primary-50 text-primary-700 hover:bg-primary-50',
        className,
      )}
      {...props}
    />
  );
}
