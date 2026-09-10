'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthHeader, FormError } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { useDepartments } from '@/hooks/use-reference';
import { ServiceError } from '@/types';
import { registerSchema, type RegisterValues } from '@/lib/validation';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tErr = useTranslations('authErrors');
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const { data: departments } = useDepartments();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema(tErr)),
    defaultValues: { fullName: '', email: '', departmentId: '', password: '' },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await registerUser(values);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ServiceError && err.code === 'email_taken') {
        setFormError(tErr('emailInvalid'));
      } else if (err instanceof ServiceError && err.code === 'weak_password') {
        setFormError(tErr('passwordWeak'));
      } else {
        setFormError(tErr('genericError'));
      }
    }
  }

  return (
    <div>
      <AuthHeader title={t('createTitle')} subtitle={t('createSubtitle')} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={formError} />

        <Input
          label={tc('fullName')}
          {...register('fullName')}
          error={errors.fullName?.message}
          placeholder="Amir Rahmani"
          autoComplete="name"
        />

        <Input
          type="email"
          label={tc('email')}
          {...register('email')}
          error={errors.email?.message}
          placeholder="name@gmail.com"
          autoComplete="email"
        />

        <Select
          label={tc('department')}
          {...register('departmentId')}
          error={errors.departmentId?.message}
          placeholder={t('selectDepartment')}
          options={(departments ?? []).map((d) => ({ value: d.id, label: d.name }))}
        />

        <PasswordInput
          label={tc('password')}
          {...register('password')}
          error={errors.password?.message}
          hint={tErr('passwordMin')}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          {isSubmitting ? t('creatingAccount') : t('createButton')}
          {!isSubmitting && <ArrowRight size={18} />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('alreadyHave')}{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-700">
          {tc('signIn')}
        </Link>
      </p>
    </div>
  );
}
