'use client';

import { LogOut, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/context/auth-context';
import { useNetworkMode } from '@/context/network-mode-context';
import {
  navItemsForRole,
  SECTION_LABEL_KEY,
  SECTION_ORDER,
  type NavSection,
} from '@/lib/nav';
import { cn } from '@/lib/utils';

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('nav');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const { user, logout } = useAuth();
  const { onNet } = useNetworkMode();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!user) return null;

  const items = navItemsForRole(user.role);
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: items.filter((i) => i.section === section),
  }))
    .filter((g) => g.items.length > 0)
    // The management console is on-net only (spec 2.6.2) — hide it off-net.
    .filter((g) => onNet || g.section !== 'manage');

  async function handleSignOut() {
    onClose();
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col border-e border-line bg-white transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
        aria-label={t('menu')}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t('menu')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2 scrollbar-slim">
          {grouped.map((group) => (
            <div key={group.section}>
              <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t(SECTION_LABEL_KEY[group.section as NavSection])}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
                        )}
                      >
                        <Icon size={19} className={active ? 'text-primary' : 'text-slate-400'} />
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.fullName} src={user.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{tRoles(user.role)}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={19} className="text-slate-400" />
            {tCommon('signOut')}
          </button>
        </div>
      </aside>
    </>
  );
}
