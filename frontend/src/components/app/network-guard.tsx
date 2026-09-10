'use client';

import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/states';
import { useNetworkMode } from '@/context/network-mode-context';

// Gates the management console to the internal network (spec 2.6.2). Off-net it shows
// a locked screen instead of the page. Mirrors RoleGuard; compose the two around admin
// page content. The backend enforces the same rule via RequireOnNet, so this is UX,
// not the security boundary.
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { onNet } = useNetworkMode();
  const t = useTranslations('accessMode');

  if (!onNet) {
    return (
      <div className="py-8">
        <EmptyState
          icon={ShieldAlert}
          title={t('consoleLockedTitle')}
          description={t('consoleLockedHint')}
        />
      </div>
    );
  }
  return <>{children}</>;
}
