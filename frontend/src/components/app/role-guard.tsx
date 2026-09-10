'use client';

import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import type { Role } from '@/types';

export function RoleGuard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  const t = useTranslations('admin');

  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      <div className="py-8">
        <EmptyState
          icon={ShieldAlert}
          title={t('forbiddenTitle')}
          description={t('forbiddenHint')}
        />
      </div>
    );
  }
  return <>{children}</>;
}
