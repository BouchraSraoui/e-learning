'use client';

import { ArrowRight, ChevronRight, Fingerprint, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/ui/logo';

// Same gate as the login button: SSO is live only when both env vars are set.
const SSO_LOGIN_URL =
  process.env.NEXT_PUBLIC_SSO_ENABLED === 'true'
    ? (process.env.NEXT_PUBLIC_SSO_LOGIN_URL ?? '')
    : '';

// Identity providers an org would wire up. Selecting any starts the configured
// org SSO flow (one backend endpoint today; per-provider routing is config later).
const PROVIDERS = [
  {
    key: 'entra',
    name: 'Microsoft Entra ID',
    subKey: 'providerEntraSub',
    mark: (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <rect x="1" y="1" width="8.4" height="8.4" fill="#F25022" />
        <rect x="10.6" y="1" width="8.4" height="8.4" fill="#7FBA00" />
        <rect x="1" y="10.6" width="8.4" height="8.4" fill="#00A4EF" />
        <rect x="10.6" y="10.6" width="8.4" height="8.4" fill="#FFB900" />
      </svg>
    ),
  },
  {
    key: 'google',
    name: 'Google Workspace',
    subKey: 'providerGoogleSub',
    mark: <span className="text-base font-bold text-[#4285F4]">G</span>,
  },
  {
    key: 'okta',
    name: 'Okta',
    subKey: 'providerOktaSub',
    mark: <ShieldCheck size={19} className="text-[#00648D]" />,
  },
] as const;

export default function SsoSignInPage() {
  const t = useTranslations('sso');
  const tApp = useTranslations('app');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const year = new Date().getFullYear();

  // If SSO isn't configured this page can't initiate anything — fall back to login.
  useEffect(() => {
    if (!SSO_LOGIN_URL) router.replace('/login');
  }, [router]);

  function startSso() {
    if (SSO_LOGIN_URL) window.location.href = SSO_LOGIN_URL;
  }

  const bullets = [
    { Icon: Fingerprint, text: t('orgBullet1') },
    { Icon: ShieldCheck, text: t('orgBullet2') },
    { Icon: Users, text: t('orgBullet3') },
  ];

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-auth-panel p-10 text-white lg:flex lg:flex-col xl:p-12">
        <Logo variant="light" size="lg" />

        <div className="relative z-10 mt-auto max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-[2.75rem]">
            {t('orgBrandHeading')}
          </h1>
          <ul className="mt-8 space-y-4">
            {bullets.map(({ Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/12 text-white">
                  <Icon size={18} />
                </span>
                <span className="pt-1.5 text-sm font-medium text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 mt-auto pt-10 text-xs text-white/55">
          {tApp('copyright', { year })}
        </p>

        <KeyRound
          className="pointer-events-none absolute -bottom-14 end-0 h-80 w-80 -rotate-[18deg] text-white/[0.06]"
          strokeWidth={1}
          aria-hidden
        />
      </div>

      {/* Sign-in column */}
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <Logo size="lg" className="mb-8" />

            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-700">
              <ShieldCheck size={13} />
              {t('badge')}
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{t('orgHeading')}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t('orgSubtitle')}</p>

            {/* Provider picker */}
            <div className="mt-7 space-y-2.5">
              {PROVIDERS.map(({ key, name, subKey, mark }) => (
                <button
                  key={key}
                  type="button"
                  onClick={startSso}
                  className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 text-left transition hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-card-hover"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface">
                    {mark}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{name}</span>
                    <span className="block truncate text-xs text-muted">{t(subKey)}</span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500"
                  />
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-line" />
              {t('or')}
              <span className="h-px flex-1 bg-line" />
            </div>

            {/* Email-domain route */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startSso();
              }}
            >
              <label htmlFor="sso-email" className="block text-sm font-medium text-ink">
                {t('emailLabel')}
              </label>
              <div className="mt-2 flex items-stretch gap-2">
                <input
                  id="sso-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amir.rahmani@icosnet.com"
                  autoComplete="email"
                  className="h-12 flex-1 rounded-xl border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                />
                <button
                  type="submit"
                  aria-label={t('emailLabel')}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-primary-glow transition hover:bg-primary-700 active:bg-primary-800"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">{t('emailHint')}</p>
            </form>

            {/* Manual fallback */}
            <p className="mt-6 text-center text-sm text-muted">
              {t('manualPrompt')}{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary-700">
                {t('manualLink')}
              </Link>
            </p>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <ShieldCheck size={13} />
              {t('protectedBy')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
