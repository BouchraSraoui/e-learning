import {
  Award,
  Bell,
  BookMarked,
  BookOpen,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Medal,
  MessagesSquare,
  ScrollText,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import type { Role } from '@/types';

export type NavSection = 'learn' | 'manage' | 'account';

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  section: NavSection;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'learn' },
  { key: 'catalog', href: '/catalog', icon: BookOpen, section: 'learn' },
  { key: 'myLearning', href: '/my-learning', icon: GraduationCap, section: 'learn' },
  { key: 'certificates', href: '/certificates', icon: Award, section: 'learn' },
  { key: 'badges', href: '/badges', icon: Medal, section: 'learn' },
  { key: 'leaderboard', href: '/leaderboard', icon: Trophy, section: 'learn' },
  { key: 'community', href: '/community', icon: MessagesSquare, section: 'learn' },
  { key: 'assistant', href: '/assistant', icon: Sparkles, section: 'learn' },

  { key: 'users', href: '/admin/users', icon: Users, section: 'manage', roles: ['admin'] },
  {
    key: 'courses',
    href: '/admin/courses',
    icon: BookMarked,
    section: 'manage',
    roles: ['admin', 'manager'],
  },
  {
    key: 'analytics',
    href: '/admin/analytics',
    icon: ChartColumn,
    section: 'manage',
    roles: ['admin'],
  },
  {
    key: 'reports',
    href: '/admin/reports',
    icon: ClipboardList,
    section: 'manage',
    roles: ['admin', 'manager'],
  },
  { key: 'faq', href: '/admin/faq', icon: CircleHelp, section: 'manage', roles: ['admin'] },
  { key: 'audit', href: '/admin/audit', icon: ScrollText, section: 'manage', roles: ['admin'] },

  { key: 'notifications', href: '/notifications', icon: Bell, section: 'account' },
  { key: 'profile', href: '/profile', icon: UserRound, section: 'account' },
  { key: 'settings', href: '/settings', icon: Settings, section: 'account' },
];

export const SECTION_ORDER: NavSection[] = ['learn', 'manage', 'account'];

export const SECTION_LABEL_KEY: Record<NavSection, string> = {
  learn: 'sectionLearn',
  manage: 'sectionManage',
  account: 'sectionAccount',
};

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

export function navKeyForPath(pathname: string): string | null {
  const match = NAV_ITEMS.filter((item) => pathname.startsWith(item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.key ?? null;
}
