'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthHeader, FormError } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/states';
import { services } from '@/services';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation';

function ResetPasswordForm() {
  const t = useTranslations('auth');
  const tErr = useTranslations('authErrors');
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') ?? undefined;
  const token = searchParams.get('token') ?? undefined;
  const email = searchParams.get('email') ?? undefined;
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema(tErr)),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    try {
      await services.auth.resetPassword({ password: values.password, uid, token, email });
      setDone(true);
    } catch {
      setFormError(tErr('genericError'));
    }
  }

  if (done) {
    return (
      <div>
        <AuthHeader title={t('passwordUpdatedTitle')} />
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CircleCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">{t('passwordUpdatedSubtitle')}</p>
        </div>
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

  return (
    <div>
      <AuthHeader title={t('newPasswordTitle')} subtitle={t('newPasswordSubtitle')} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={formError} />
        <PasswordInput
          label={t('newPassword')}
          {...register('password')}
          error={errors.password?.message}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <PasswordInput
          label={t('confirmPassword')}
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {isSubmitting ? t('updating') : t('updatePassword')}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
