'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useNetworkMode } from '@/context/network-mode-context';
import { cn } from '@/lib/utils';

// On-net / Off-net access-mode indicator (spec 2.6.2). On-net = inside the internal
// Icosnet network; off-net = secured external access (VPN / controlled).

export function NetworkModeBadge({ className }: { className?: string }) {
  const t = useTranslations('accessMode');
  const { onNet } = useNetworkMode();
  // On-net is the normal state — only surface the indicator when off-net.
  if (onNet) return null;
  return (
    <span title={t('offNetTooltip')} className={cn('inline-flex', className)}>
      <Badge tone="warning">
        <ShieldCheck size={13} />
        {t('offNet')}
      </Badge>
    </span>
  );
}

// Dev-only toggle to simulate the network origin (rendered inside the user menu).
// stopPropagation keeps the dropdown open when the switch is flipped.
export function NetworkModeToggle() {
  const t = useTranslations('accessMode');
  const { mode, isDemo, setMode } = useNetworkMode();
  if (!isDemo) return null;
  return (
    <>
      <div className="my-1 border-t border-line" />
      <div className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={mode === 'off_net'}
          onChange={(checked) => setMode(checked ? 'off_net' : 'on_net')}
          label={t('demoToggleLabel')}
          hint={t('demoToggleHint')}
        />
      </div>
    </>
  );
}

// Informational banner shown while off-net — reassures that external access is
// secured (VPN / controlled). Blocks nothing (indicator-only feature).
export function NetworkModeBanner() {
  const t = useTranslations('accessMode');
  const { onNet } = useNetworkMode();
  if (onNet) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 text-[13px] font-medium text-amber-700 sm:px-6 lg:px-8">
        <ShieldCheck size={15} className="shrink-0" />
        <span>{t('securedBanner')}</span>
      </div>
    </div>
  );
}
