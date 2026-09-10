'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCreateUser, useUpdateUser } from '@/hooks/use-admin-users';
import { ServiceError, type AdminUserInput, type Department, type Role, type User } from '@/types';

const ROLES: Role[] = ['user', 'manager', 'admin'];
const LANGS = ['fr', 'en'] as const;

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string(),
  role: z.enum(['user', 'manager', 'admin']),
  departmentId: z.string(),
  jobTitle: z.string(),
  language: z.enum(['fr', 'en']),
  active: z.boolean(),
  password: z.string().min(8).or(z.literal('')),
});

type Values = z.infer<typeof schema>;

export function UserFormModal({
  open,
  onClose,
  user,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  departments: Department[];
}) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const tRoles = useTranslations('roles');
  const toast = useToast();
  const isEdit = Boolean(user);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '', firstName: '', lastName: '', role: 'user',
      departmentId: '', jobTitle: '', language: 'fr', active: true, password: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      email: user?.email ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      role: user?.role ?? 'user',
      departmentId: user?.departmentId ?? '',
      jobTitle: user?.jobTitle ?? '',
      language: user?.language ?? 'fr',
      active: user?.active ?? true,
      password: '',
    });
  }, [open, user, reset]);

  async function onSubmit(values: Values) {
    const input: AdminUserInput = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      role: values.role,
      departmentId: values.departmentId || null,
      jobTitle: values.jobTitle,
      language: values.language,
      active: values.active,
      password: values.password || undefined,
    };
    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({ id: user.id, input });
        toast.success(t('userUpdated'));
      } else {
        await createUser.mutateAsync(input);
        toast.success(t('userCreated'));
      }
      onClose();
    } catch (err) {
      const code = err instanceof ServiceError ? err.code : undefined;
      toast.error(code === 'email_taken' ? t('emailTaken') : t('saveFailed'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? t('editUser') : t('newUser')}
      description={isEdit ? user?.email : t('newUserHint')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {!isEdit && (
          <Input
            type="email"
            label={tc('email')}
            required
            {...register('email')}
            error={errors.email && t('emailInvalid')}
            placeholder="name@gmail.com"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('firstName')}
            required
            {...register('firstName')}
            error={errors.firstName && t('required')}
          />
          <Input
            label={t('lastName')}
            {...register('lastName')}
            error={errors.lastName && t('required')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('role')}
            {...register('role')}
            options={ROLES.map((r) => ({ value: r, label: tRoles(r) }))}
          />
          <Select
            label={tc('department')}
            {...register('departmentId')}
            options={[
              { value: '', label: t('noDepartment') },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('jobTitle')} {...register('jobTitle')} />
          <Select
            label={tc('language')}
            {...register('language')}
            options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
        </div>
        <Input
          type="password"
          label={t('password')}
          {...register('password')}
          error={errors.password && t('passwordMin')}
          hint={isEdit ? t('passwordEditHint') : t('passwordCreateHint')}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        <Checkbox label={t('accountActive')} {...register('active')} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? tc('saveChanges') : t('createUser')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
