'use client';

import { ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, MenuItem } from '@/components/ui/menu';
import { Logo } from '@/components/ui/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationsBell } from '@/components/app/notifications-bell';
import { NetworkModeBadge, NetworkModeToggle } from '@/components/app/network-mode';
import { useAuth } from '@/context/auth-context';
import { useNetworkMode } from '@/context/network-mode-context';
import { navItemsForRole, navKeyForPath, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

// Shown inline on the horizontal bar; the rest of the "learn" items collapse
// into a "More" dropdown so the bar stays readable at any width.
const PRIMARY_KEYS = ['dashboard', 'catalog', 'myLearning'];

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const tRoles = useTranslations('roles');
  const { user, logout } = useAuth();
  const { onNet } = useNetworkMode();
  const pathname = usePathname();
  const router = useRouter();

  const items = user ? navItemsForRole(user.role) : [];
  const primary = items.filter((i) => PRIMARY_KEYS.includes(i.key));
  const more = items.filter((i) => i.section === 'learn' && !PRIMARY_KEYS.includes(i.key));
  // The management console is on-net only (spec 2.6.2) — hide the group off-net.
  const manage = onNet ? items.filter((i) => i.section === 'manage') : [];
  const activeKey = navKeyForPath(pathname);

  async function handleSignOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        {/* Mobile: hamburger opens the drawer. Desktop uses the inline nav below. */}
        <button
          onClick={onOpenNav}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-slate-600 hover:bg-slate-50 lg:hidden"
          aria-label={t('menu')}
        >
          <Menu size={20} />
        </button>

        {/* Logo → home, from anywhere in the app. */}
        <Link href="/dashboard" aria-label={t('home')} className="shrink-0">
          <Logo size="sm" subtitle={false} />
        </Link>

        <nav className="ms-2 hidden items-center gap-0.5 lg:flex">
          {primary.map((item) => (
            <NavLink key={item.key} item={item} active={item.key === activeKey} />
          ))}
          {more.length > 0 && <NavGroup label={t('more')} items={more} activeKey={activeKey} />}
          {manage.length > 0 && (
            <NavGroup label={t('sectionManage')} items={manage} activeKey={activeKey} />
          )}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <NetworkModeBadge className="hidden sm:inline-flex" />

          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          <NotificationsBell />

          {user && (
            <Dropdown
              align="end"
              trigger={
                <span className="ms-1 flex items-center gap-2 rounded-xl border border-line py-1 ps-1 pe-2.5 hover:bg-slate-50">
                  <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                  <span className="hidden text-start leading-tight sm:block">
                    <span className="block text-sm font-semibold text-ink">{user.firstName}</span>
                    <span className="block text-xs text-muted">
                      {user.jobTitle || tRoles(user.role)}
                    </span>
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </span>
              }
            >
              <MenuItem onClick={() => router.push('/profile')}>
                <UserRound size={16} className="text-slate-400" />
                {t('profile')}
              </MenuItem>
              <MenuItem onClick={() => router.push('/settings')}>
                <Settings size={16} className="text-slate-400" />
                {t('settings')}
              </MenuItem>
              <NetworkModeToggle />
              <div className="my-1 border-t border-line" />
              <MenuItem onClick={handleSignOut} className="text-rose-600 hover:bg-rose-50">
                <LogOut size={16} />
                {tc('signOut')}
              </MenuItem>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslations('nav');
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
      )}
    >
      <Icon size={17} className={active ? 'text-primary' : 'text-slate-400'} />
      {t(item.key)}
    </Link>
  );
}

function NavGroup({
  label,
  items,
  activeKey,
}: {
  label: string;
  items: NavItem[];
  activeKey: string | null;
}) {
  const t = useTranslations('nav');
  const router = useRouter();
  const active = items.some((i) => i.key === activeKey);
  return (
    <Dropdown
      align="start"
      trigger={
        <span
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
          )}
        >
          {label}
          <ChevronDown size={15} className="text-slate-400" />
        </span>
      }
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <MenuItem
            key={item.key}
            active={item.key === activeKey}
            onClick={() => router.push(item.href)}
          >
            <Icon size={16} className="text-slate-400" />
            {t(item.key)}
          </MenuItem>
        );
      })}
    </Dropdown>
  );
}
