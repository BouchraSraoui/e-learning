'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Award,
  CircleCheck,
  Clock,
  CloudUpload,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Target,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StatCard } from '@/components/app/stat-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/states';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { useCertificates } from '@/hooks/use-certificates';
import { useMyEnrollments } from '@/hooks/use-enrollment';
import { useDepartments } from '@/hooks/use-reference';
import { setUserLocale } from '@/i18n/locale';
import { type Locale, localeNames, locales } from '@/i18n/config';
import { services } from '@/services';
import type { ProfileUpdate, User } from '@/types';
import { profileSchema, type ProfileValues } from '@/lib/validation';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png'];

export default function ProfilePage() {
  const tp = useTranslations('profile');
  const { user, applyUser } = useAuth();
  const [tab, setTab] = useState('overview');

  if (!user) return null;

  async function save(patch: ProfileUpdate): Promise<User> {
    const updated = await services.users.updateProfile(user!.id, patch);
    applyUser(updated);
    return updated;
  }

  async function saveAvatar(file: File | null): Promise<User> {
    const updated = await services.users.updateAvatar(file);
    applyUser(updated);
    return updated;
  }

  return (
    <div className="space-y-6">
      <ProfileBanner user={user} onEdit={() => setTab('settings')} onAvatar={saveAvatar} />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: tp('overview') },
          { value: 'settings', label: tp('settings') },
        ]}
      />

      {tab === 'overview' ? (
        <OverviewPanel user={user} />
      ) : (
        <SettingsForm user={user} onSave={save} />
      )}
    </div>
  );
}

function OverviewPanel({ user }: { user: User }) {
  const tp = useTranslations('profile');
  const tc = useTranslations('common');
  const tRoles = useTranslations('roles');
  const locale = useLocale();
  const { data: departments } = useDepartments();

  const departmentName = departments?.find((d) => d.id === user.departmentId)?.name ?? '';
  const memberSince = new Date(user.createdAt).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleCheck}
          tone="emerald"
          value={user.stats.coursesCompleted}
          label={tp('completedCourses')}
        />
        <StatCard
          icon={Award}
          tone="violet"
          value={user.stats.certificates}
          label={tp('certificates')}
        />
        <StatCard
          icon={Clock}
          tone="amber"
          value={`${user.stats.learningHours}h`}
          label={tp('learningHours')}
        />
        <StatCard
          icon={Target}
          tone="primary"
          value={`${user.stats.avgQuizScore}%`}
          label={tp('avgQuizScore')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="mb-4 text-base font-bold text-ink">{tp('personalInfo')}</h3>
            <dl className="space-y-3.5">
              <InfoRow icon={Mail} label={tp('emailAddress')} value={user.email} />
              {user.phone && <InfoRow icon={Phone} label={tp('phone')} value={user.phone} />}
              {user.location && (
                <InfoRow icon={MapPin} label={tp('location')} value={user.location} />
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4 text-sm">
              <span>
                <span className="text-muted">{tp('role')}: </span>
                <span className="font-semibold text-ink">{tRoles(user.role)}</span>
              </span>
              {departmentName && (
                <span>
                  <span className="text-muted">{tc('department')}: </span>
                  <span className="font-semibold text-ink">{departmentName}</span>
                </span>
              )}
              <span>
                <span className="text-muted">{tp('memberSince')}: </span>
                <span className="font-semibold text-ink">{memberSince}</span>
              </span>
            </div>
          </CardBody>
        </Card>

        <LearningHistory />
      </div>
    </div>
  );
}

function LearningHistory() {
  const tp = useTranslations('profile');
  const locale = useLocale();
  const { data: enrollments } = useMyEnrollments();
  const { data: certificates } = useCertificates();

  const completed = (enrollments ?? []).filter((e) => e.status === 'completed');
  const certBySlug = new Map((certificates ?? []).map((c) => [c.courseSlug, c]));

  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 text-base font-bold text-ink">{tp('completedCoursesTitle')}</h3>
        {completed.length === 0 ? (
          <EmptyState
            icon={Award}
            title={tp('noCompletedCourses')}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="space-y-2.5">
            {completed.map((e) => {
              const cert = certBySlug.get(e.course.slug);
              const date = e.completedAt
                ? new Date(e.completedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '';
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-line p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CircleCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{e.course.title}</p>
                    {date && <p className="text-xs text-muted">{tp('completedOn', { date })}</p>}
                  </div>
                  {cert && (
                    <Link
                      href="/certificates"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-700"
                    >
                      <Award size={14} />
                      {tp('viewCertificate')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function ProfileBanner({
  user,
  onEdit,
  onAvatar,
}: {
  user: User;
  onEdit: () => void;
  onAvatar: (file: File | null) => Promise<User>;
}) {
  const tp = useTranslations('profile');
  const tc = useTranslations('common');
  const tErr = useTranslations('authErrors');
  const { data: departments } = useDepartments();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const departmentName = departments?.find((d) => d.id === user.departmentId)?.name ?? '';
  const meta = [user.jobTitle, departmentName, user.location].filter(Boolean).join(' · ');

  async function handleAvatar(file: File | null) {
    try {
      await onAvatar(file);
      toast.success(tp('saved'));
    } catch {
      toast.error(tErr('genericError'));
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error(tp('avatarWrongType'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(tp('avatarTooLarge'));
      return;
    }
    handleAvatar(file);
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-28 bg-auth-panel sm:h-32" />
      <div className="px-5 pb-5 sm:px-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative -mt-12">
            <Avatar name={user.fullName} src={user.avatarUrl} size="xl" className="ring-4 ring-white" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -end-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-sm hover:bg-primary-700"
              aria-label={tp('changeAvatar')}
            >
              <CloudUpload size={15} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onPick}
            />
          </div>

          <div className="min-w-0 flex-1 pt-2">
            <h2 className="truncate text-2xl font-extrabold tracking-tight text-ink">
              {user.fullName}
            </h2>
            {meta && <p className="truncate text-sm text-muted">{meta}</p>}
          </div>

          <div className="flex gap-2 pb-1">
            {user.avatarUrl && (
              <Button variant="secondary" size="sm" onClick={() => handleAvatar(null)}>
                <Trash2 size={16} />
                {tc('remove')}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil size={16} />
              {tp('editProfile')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SettingsForm({
  user,
  onSave,
}: {
  user: User;
  onSave: (patch: ProfileUpdate) => Promise<User>;
}) {
  const tp = useTranslations('profile');
  const tc = useTranslations('common');
  const tErr = useTranslations('authErrors');
  const router = useRouter();
  const toast = useToast();
  const [language, setLanguage] = useState<Locale>(user.language);
  const [emailNotifications, setEmailNotifications] = useState(user.emailNotifications);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema(tErr)),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle ?? '',
      phone: user.phone ?? '',
      location: user.location ?? '',
      bio: user.bio ?? '',
    },
  });

  async function onSubmit(values: ProfileValues) {
    const languageChanged = language !== user.language;
    await onSave({ ...values, language, emailNotifications });
    toast.success(tp('saved'));
    if (languageChanged) {
      await setUserLocale(language);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-base font-bold text-ink">{tp('personalInfo')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={tp('firstName')} {...register('firstName')} error={errors.firstName?.message} />
            <Input label={tp('lastName')} {...register('lastName')} error={errors.lastName?.message} />
          </div>
          <Input label={tp('jobTitle')} {...register('jobTitle')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={tp('phone')} {...register('phone')} />
            <Input label={tp('location')} {...register('location')} />
          </div>
          <Textarea
            label={tp('bio')}
            {...register('bio')}
            error={errors.bio?.message}
            placeholder={tp('bioPlaceholder')}
          />
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-base font-bold text-ink">{tp('preferences')}</h3>
            <Select
              label={tp('prefLanguage')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Locale)}
              options={locales.map((l) => ({ value: l, label: localeNames[l] }))}
            />
            <div className="rounded-xl border border-line p-3.5">
              <Checkbox
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                label={<span className="font-semibold">{tp('prefNotifications')}</span>}
              />
              <p className="ms-8 mt-1 text-xs text-muted">{tp('prefNotificationsHint')}</p>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={isSubmitting}>
            {tc('saveChanges')}
          </Button>
        </div>
      </div>
    </form>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
