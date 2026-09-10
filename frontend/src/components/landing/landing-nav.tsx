'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function LandingNav() {
  const t = useTranslations('landing');
  const { isAuthenticated } = useAuth();
  const platformHref = isAuthenticated ? '/dashboard' : '/login';
  const browseHref = isAuthenticated ? '/catalog' : '/login';

  // Elevate the sticky bar once a top-of-page sentinel scrolls out of view.
  // An IntersectionObserver avoids any per-frame scroll work.
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-full" />

      <header
        className={cn(
          'sticky top-0 z-40 border-b backdrop-blur transition-[background-color,border-color,box-shadow] duration-200',
          scrolled ? 'border-line bg-white/95 shadow-card' : 'border-transparent bg-white/85',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="mx-auto hidden items-center gap-8 md:flex">
            <Link href={browseHref} className="text-sm font-medium text-slate-600 transition-colors hover:text-ink">
              {t('nav.library')}
            </Link>
            <a href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-ink">
              {t('nav.forTeams')}
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 transition-colors hover:text-ink">
              {t('nav.certifications')}
            </a>
          </nav>

          <div className="ms-auto flex items-center gap-1.5 md:ms-0">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-ink sm:inline-flex"
            >
              {t('nav.signIn')}
            </Link>
            <Link href={platformHref} className={buttonClasses({ size: 'sm' })}>
              {t('nav.openPlatform')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
