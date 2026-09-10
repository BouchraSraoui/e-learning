'use client';

import { GraduationCap, LayoutGrid, MessageCircle, PanelLeft, PanelLeftClose, SquarePen } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { AssistantAvatar, AssistantThread } from '@/components/assistant/assistant-conversation';
import { ASSISTANT_STARTERS } from '@/components/assistant/starters';
import { Avatar } from '@/components/ui/avatar';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useAssistantChat } from '@/hooks/use-assistant-chat';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

export default function AssistantPage() {
  const t = useTranslations('assistant');
  const ts = useTranslations('assistant.starters');
  const tRoles = useTranslations('roles');
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const chat = useAssistantChat();

  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  function newChat() {
    chat.reset();
    setActiveKey(null);
  }

  function pickStarter(key: string, prompt: string) {
    setActiveKey(key);
    chat.submit(prompt);
  }

  const groups: { id: 'today' | 'earlier'; label: string }[] = [
    { id: 'today', label: t('today') },
    { id: 'earlier', label: t('earlier') },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <aside
        className={cn(
          'w-64 shrink-0 flex-col border-e border-line bg-surface',
          collapsed ? 'hidden' : 'hidden md:flex',
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm">
            <GraduationCap size={18} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-ink">{t('title')}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('brandTag')}</p>
          </div>
        </div>

        <div className="px-3 pb-2 pt-1">
          <button type="button" onClick={newChat} className={buttonClasses({ className: 'w-full' })}>
            <SquarePen size={16} />
            {t('newChat')}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2 scrollbar-slim">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.id === 'today' && (
                  <SidebarItem
                    icon={<MessageCircle size={16} />}
                    label={t('newChatTitle')}
                    active={activeKey === null}
                    onClick={newChat}
                  />
                )}
                {ASSISTANT_STARTERS.filter((s) => s.group === group.id).map((s) => (
                  <SidebarItem
                    key={s.key}
                    icon={<s.icon size={16} />}
                    label={ts(`${s.key}Title`)}
                    active={activeKey === s.key}
                    onClick={() => pickStarter(s.key, s.prompt[locale])}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {user && (
          <div className="flex items-center gap-2.5 border-t border-line px-3 py-3">
            <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{user.jobTitle || tRoles(user.role)}</p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t('collapseSidebar')}
              title={t('collapseSidebar')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3 sm:px-5">
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label={t('expandSidebar')}
              title={t('expandSidebar')}
              className="hidden h-9 w-9 place-items-center rounded-xl border border-line text-slate-500 hover:bg-slate-50 md:grid"
            >
              <PanelLeft size={17} />
            </button>
          )}
          <AssistantAvatar size={38} status={chat.offline ? 'offline' : 'online'} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-ink">{t('name')}</p>
            <p
              className={cn(
                'truncate text-xs font-semibold',
                chat.offline ? 'text-amber-600' : 'text-emerald-600',
              )}
            >
              {chat.offline ? t('statusOffline') : t('statusTrained')}
            </p>
          </div>
          <button
            type="button"
            onClick={newChat}
            aria-label={t('newChat')}
            title={t('newChat')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line text-slate-500 hover:bg-slate-50 md:hidden"
          >
            <SquarePen size={16} />
          </button>
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">{t('platform')}</span>
          </Link>
        </header>

        <AssistantThread chat={chat} variant="page" user={user} />
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm transition-colors',
        active
          ? 'bg-primary-50 font-semibold text-primary-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-primary' : 'text-slate-400')}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
