'use client';

import { ArrowRight, Award, LineChart, Sparkles, Waypoints } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef } from 'react';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroPreview } from '@/components/landing/hero-preview';
import { buttonClasses } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/context/auth-context';
import { useInView, useMounted } from '@/hooks/use-motion';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const t = useTranslations('landing');
  const tApp = useTranslations('app');
  const { isAuthenticated } = useAuth();

  const browseHref = isAuthenticated ? '/catalog' : '/login';
  const year = new Date().getFullYear();

  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef);
  const mounted = useMounted();

  // Reveal state: visible until mounted, then held hidden until scrolled into
  // view, then animated in once. Gated behind motion-safe so reduced-motion and
  // no-JS users always see finished content.
  const reveal = (delay: number) =>
    ({
      className: featuresInView ? 'motion-safe:animate-enter' : mounted ? 'motion-safe:opacity-0' : '',
      style: { animationDelay: `${delay}ms` },
    }) as const;

  const features = [
    {
      Icon: Waypoints,
      tile: 'bg-primary-50 text-primary',
      title: t('feature1Title'),
      body: t('feature1Body'),
    },
    {
      Icon: LineChart,
      tile: 'bg-emerald-50 text-emerald-600',
      title: t('feature2Title'),
      body: t('feature2Body'),
    },
    {
      Icon: Award,
      tile: 'bg-purple-50 text-purple-600',
      title: t('feature3Title'),
      body: t('feature3Body'),
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <LandingNav />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-20">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3.5 py-1.5 text-sm font-semibold text-primary-700 motion-safe:animate-enter"
                style={{ animationDelay: '60ms' }}
              >
                <Sparkles size={15} />
                {t('badge')}
              </span>

              <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink motion-safe:animate-enter sm:text-6xl">
                {t('heroTitle1')}
                <br />
                {t('heroTitle2')}
              </h1>

              <p
                className="mt-6 max-w-md text-lg leading-relaxed text-muted motion-safe:animate-enter"
                style={{ animationDelay: '120ms' }}
              >
                {t('heroSubtitle')}
              </p>

              <div
                className="mt-8 flex flex-wrap items-center gap-3 motion-safe:animate-enter"
                style={{ animationDelay: '180ms' }}
              >
                <Link
                  href={browseHref}
                  className={buttonClasses({
                    size: 'lg',
                    className:
                      'group transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[.98]',
                  })}
                >
                  {t('browseLibrary')}
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-150 rtl:rotate-180 motion-safe:group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/login"
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'lg',
                    className:
                      'transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[.98]',
                  })}
                >
                  {t('nav.signIn')}
                </Link>
              </div>

            </div>

            <div className="motion-safe:animate-enter lg:ps-4" style={{ animationDelay: '240ms' }}>
              <HeroPreview />
            </div>
          </div>
        </section>

        <section
          ref={featuresRef}
          id="features"
          className="border-t border-line bg-surface scroll-mt-16"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className={cn(
                  'font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl',
                  reveal(0).className,
                )}
                style={reveal(0).style}
              >
                {t('featuresTitle')}
              </h2>
              <p
                className={cn('mt-4 text-lg text-muted', reveal(80).className)}
                style={reveal(80).style}
              >
                {t('featuresSubtitle')}
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={cn(
                    'group rounded-2xl border border-line bg-white p-6 shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:shadow-card-hover motion-safe:hover:-translate-y-0.5',
                    reveal(160 + i * 80).className,
                  )}
                  style={reveal(160 + i * 80).style}
                >
                  <span
                    className={cn(
                      'grid h-12 w-12 place-items-center rounded-xl transition-transform duration-200 motion-safe:group-hover:scale-[1.04]',
                      f.tile,
                    )}
                  >
                    <f.Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo size="sm" />
          <p className="text-xs text-muted">{tApp('copyright', { year })}</p>
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link href="/login" className="transition-colors hover:text-ink">
              {t('nav.signIn')}
            </Link>
            <a href="#features" className="transition-colors hover:text-ink">
              {t('nav.forTeams')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
