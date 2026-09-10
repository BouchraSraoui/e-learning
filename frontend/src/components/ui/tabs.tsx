'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: React.ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-6 border-b border-line', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors',
              active
                ? 'border-primary text-ink'
                : 'border-transparent text-muted hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
