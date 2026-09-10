'use client';

import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/states';

export function ComingSoon({ titleKey, phase }: { titleKey: string; phase: string }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  return (
    <div className="py-8">
      <EmptyState
        icon={Rocket}
        title={t(titleKey)}
        description={`${tc('comingSoon')} — ${phase}`}
      />
    </div>
  );
}
