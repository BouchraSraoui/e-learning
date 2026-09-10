'use client';

import { Bot, ChevronDown, Maximize2, Minus, SquarePen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AssistantAvatar, AssistantThread } from '@/components/assistant/assistant-conversation';
import { useAuth } from '@/context/auth-context';
import { useAssistantChat } from '@/hooks/use-assistant-chat';
import { cn } from '@/lib/utils';

export function AssistantFab() {
  const t = useTranslations('assistant');
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const chat = useAssistantChat();

  if (pathname === '/assistant') return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={t('name')}
          className={cn(
            'fixed bottom-24 end-4 z-40 flex w-[calc(100vw-2rem)] max-w-[380px] flex-col',
            'h-[560px] max-h-[calc(100vh-8rem)] animate-scale-in overflow-hidden',
            'rounded-3xl border border-line bg-white shadow-pop',
          )}
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-3">
            <AssistantAvatar size={40} status={chat.offline ? 'offline' : 'online'} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold text-ink">{t('name')}</p>
              <p
                className={cn(
                  'truncate text-xs font-semibold',
                  chat.offline ? 'text-amber-600' : 'text-emerald-600',
                )}
              >
                {chat.offline ? t('statusOffline') : t('statusOnline')}
              </p>
            </div>
            <Link
              href="/assistant"
              onClick={() => setOpen(false)}
              className={PANEL_ICON_CLS}
              title={t('openFull')}
              aria-label={t('openFull')}
            >
              <Maximize2 size={16} />
            </Link>
            <PanelIconButton label={t('newChat')} onClick={chat.reset}>
              <SquarePen size={16} />
            </PanelIconButton>
            <PanelIconButton label={t('minimize')} onClick={() => setOpen(false)}>
              <Minus size={16} />
            </PanelIconButton>
          </header>

          <AssistantThread chat={chat} variant="panel" user={user} />
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t('minimize') : t('launcherLabel')}
        className={cn(
          'fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-primary-glow',
          'transition-transform hover:scale-105 active:scale-95',
        )}
      >
        {open ? <ChevronDown size={26} /> : <Bot size={26} />}
      </button>
    </>
  );
}

const PANEL_ICON_CLS =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700';

function PanelIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={PANEL_ICON_CLS} title={label} aria-label={label}>
      {children}
    </button>
  );
}
