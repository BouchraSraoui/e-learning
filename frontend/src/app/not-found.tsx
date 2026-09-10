'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function NotFound() {
  const t = useTranslations('states');
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <Logo size="lg" />
        <p className="mt-8 font-display text-7xl font-extrabold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">{t('notFoundTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">{t('notFoundSubtitle')}</p>
        <Link href="/" className={buttonClasses({ className: 'mt-6' })}>
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
