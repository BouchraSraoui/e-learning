'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthHeader } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { services } from '@/services';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('authErrors');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema(tErr)),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    await services.auth.requestPasswordReset(values.email);
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div>
        <AuthHeader title={t('resetSentTitle')} />
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CircleCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">{t('resetSentSubtitle', { email: sentTo })}</p>
        </div>
        <div className="mt-6 space-y-3 text-center">
          <Link
            href={`/reset-password?email=${encodeURIComponent(sentTo)}`}
            className="inline-block text-sm font-semibold text-primary hover:text-primary-700"
          >
            {t('newPasswordTitle')} →
          </Link>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-slate-700"
            >
              <ArrowLeft size={16} />
              {t('backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader title={t('resetTitle')} subtitle={t('resetSubtitle')} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          type="email"
          label={tc('email')}
          {...register('email')}
          error={errors.email?.message}
          placeholder="name@gmail.com"
          autoComplete="email"
        />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {isSubmitting ? t('sending') : t('sendResetLink')}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-700"
        >
          <ArrowLeft size={16} />
          {t('backToSignIn')}
        </Link>
      </div>
    </div>
  );
}
