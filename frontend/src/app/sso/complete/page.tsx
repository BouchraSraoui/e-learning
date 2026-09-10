'use client';

import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/context/auth-context';

// Standalone page (outside the (auth)/(app) route groups → root layout only: no
// app shell, no auth-guard bounce, but still inside AuthProvider + i18n). The
// backend SSO callback redirects the browser here with a single-use ?code=.
function SsoCompleteInner() {
  const t = useTranslations('sso');
  const params = useSearchParams();
  const router = useRouter();
  const { completeSsoLogin } = useAuth();
  const [error, setError] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    // The hand-off code is single-use — run the exchange exactly once, even under
    // React StrictMode's double-invoke in dev.
    if (ran.current) return;
    ran.current = true;
    const code = params.get('code');
    if (!code || params.get('error')) {
      setError(true);
      return;
    }
    completeSsoLogin(code)
      .then(() => router.replace('/dashboard'))
      .catch(() => setError(true));
  }, [params, completeSsoLogin, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <TriangleAlert size={22} />
            </div>
            <p className="text-sm text-ink">{t('error')}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-700"
            >
              <ArrowLeft size={16} />
              {t('backToLogin')}
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-muted">
            <Spinner size={28} className="text-primary" />
            <p className="text-sm">{t('completing')}</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SsoCompletePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <SsoCompleteInner />
    </Suspense>
  );
}
