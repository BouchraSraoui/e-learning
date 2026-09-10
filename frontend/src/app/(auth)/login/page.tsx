'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthHeader, FormError } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, PasswordInput } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { ServiceError } from '@/types';
import { loginSchema, type LoginValues } from '@/lib/validation';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('authErrors');
  const router = useRouter();
  const { login, status } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  // Company SSO is not wired to any directory yet (see Remark 3 / decision D1). It
  // turns on only when the enable flag is set AND an SP-initiated login URL is
  // provided; otherwise the button stays visible but disabled with a "coming soon"
  // caption, so the recurring "SSO doesn't work" complaint becomes a clear status.
  const ssoLoginUrl =
    process.env.NEXT_PUBLIC_SSO_ENABLED === 'true'
      ? (process.env.NEXT_PUBLIC_SSO_LOGIN_URL ?? '')
      : '';
  const ssoEnabled = ssoLoginUrl !== '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema(tErr)),
    defaultValues: { email: '', password: '', keepSignedIn: true },
  });

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await login({ email: values.email, password: values.password });
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ServiceError && err.code === 'invalid_credentials') {
        setFormError(tErr('invalidCredentials'));
      } else {
        setFormError(tErr('genericError'));
      }
    }
  }

  return (
    <div>
      <AuthHeader title={t('welcomeBack')} subtitle={t('welcomeSubtitle')} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={formError} />

        <Input
          type="email"
          label={tc('email')}
          {...register('email')}
          error={errors.email?.message}
          placeholder="amir.rahmani@gmail.com"
          autoComplete="email"
        />

        <PasswordInput
          label={tc('password')}
          {...register('password')}
          error={errors.password?.message}
          placeholder="••••••••"
          autoComplete="current-password"
          labelAddon={
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary-700"
            >
              {t('forgot')}
            </Link>
          }
        />

        <Checkbox {...register('keepSignedIn')} label={t('keepSignedIn')} />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {isSubmitting ? t('signingIn') : t('signInArrow')}
          {!isSubmitting && <ArrowRight size={18} />}
        </Button>
      </form>

      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          size="lg"
          disabled={!ssoEnabled}
          aria-describedby={ssoEnabled ? undefined : 'sso-status'}
          onClick={ssoEnabled ? () => router.push('/sso') : undefined}
        >
          <ShieldCheck size={18} />
          {t('continueSso')}
        </Button>
        {!ssoEnabled && (
          <p id="sso-status" className="mt-2 text-center text-xs text-muted">
            {t('ssoComingSoon')}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {t('newHere')}{' '}
        <Link href="/register" className="font-semibold text-primary hover:text-primary-700">
          {t('createAccount')}
        </Link>
      </p>
    </div>
  );
}
