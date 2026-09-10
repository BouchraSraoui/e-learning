'use client';

import { ArrowUp, ArrowUpRight, Bot, BookOpen, Paperclip, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import type { Locale } from '@/i18n/config';
import { Avatar } from '@/components/ui/avatar';
import type { AssistantChat } from '@/hooks/use-assistant-chat';
import { cn } from '@/lib/utils';
import type { AssistantMessage, AssistantSource, User } from '@/types';
import { ASSISTANT_STARTERS } from './starters';

type Variant = 'panel' | 'page';

export function AssistantThread({
  chat,
  variant,
  user,
}: {
  chat: AssistantChat;
  variant: Variant;
  user?: Pick<User, 'firstName' | 'fullName' | 'avatarUrl'> | null;
}) {
  const t = useTranslations('assistant');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages, chat.pending]);

  const firstName = user?.firstName?.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div
        ref={scrollRef}
        className={cn('flex-1 overflow-y-auto scrollbar-slim', variant === 'page' ? 'px-4 py-6' : 'p-4')}
        role="log"
        aria-live="polite"
      >
        {chat.empty ? (
          variant === 'page' ? (
            <PageHero name={firstName} onPick={chat.submit} />
          ) : (
            <PanelGreeting name={firstName} onPick={chat.submit} />
          )
        ) : (
          <div className={cn('mx-auto w-full space-y-5', variant === 'page' && 'max-w-2xl')}>
            {chat.messages.map((m) => (
              <MessageRow key={m.id} message={m} variant={variant} user={user} onPick={chat.submit} />
            ))}
            {chat.pending && <TypingRow variant={variant} label={t('thinking')} />}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-white p-3">
        <div
          className={cn(
            'mx-auto flex w-full items-center gap-1.5 rounded-2xl border border-line bg-slate-50 ps-2 pe-1.5',
            'transition-colors focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/30',
            variant === 'page' && 'max-w-2xl',
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center text-slate-400" aria-hidden>
            <Paperclip size={17} />
          </span>
          <input
            ref={inputRef}
            value={chat.draft}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chat.submit(chat.draft);
              }
            }}
            placeholder={variant === 'page' ? t('composerPage') : t('composerPanel')}
            aria-label={variant === 'page' ? t('composerPage') : t('composerPanel')}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => chat.submit(chat.draft)}
            disabled={!chat.draft.trim() || chat.pending}
            aria-label={t('send')}
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full text-white transition-colors',
              'bg-primary hover:bg-primary-700 disabled:bg-primary-200 disabled:text-white/70',
            )}
          >
            <ArrowUp size={17} />
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-tight text-slate-400">
          {variant === 'page' ? t('disclaimerLong') : t('disclaimerShort')}
        </p>
      </div>
    </div>
  );
}


function PanelGreeting({ name, onPick }: { name?: string; onPick: (q: string) => void }) {
  const t = useTranslations('assistant');
  const ts = useTranslations('assistant.starters');
  const locale = useLocale() as Locale;
  return (
    <div className="space-y-5">
      <div className="flex gap-2.5">
        <AssistantAvatar size={32} />
        <div className="max-w-[85%] rounded-2xl rounded-ss-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm">
          {name ? t('panelGreeting', { name }) : t('panelGreetingGeneric')}
        </div>
      </div>
      <div className="ps-[42px]">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('suggested')}</p>
        <div className="flex flex-wrap gap-2">
          {ASSISTANT_STARTERS.slice(0, 4).map((s) => (
            <SuggestionChip key={s.key} label={ts(`${s.key}Title`)} onClick={() => onPick(s.prompt[locale])} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PageHero({ name, onPick }: { name?: string; onPick: (q: string) => void }) {
  const t = useTranslations('assistant');
  const ts = useTranslations('assistant.starters');
  const locale = useLocale() as Locale;
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-6 text-center">
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary text-white shadow-primary-glow">
        <Bot size={30} />
        <span className="absolute inset-0 -z-10 rounded-2xl bg-primary/25 blur-xl" />
      </span>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
        {name ? t('heroTitle', { name }) : t('heroTitleGeneric')}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{t('heroSubtitle')}</p>
      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
        {ASSISTANT_STARTERS.slice(0, 4).map((s) => (
          <StarterCard
            key={s.key}
            icon={<s.icon size={18} />}
            title={ts(`${s.key}Title`)}
            subtitle={ts(`${s.key}Subtitle`)}
            onClick={() => onPick(s.prompt[locale])}
          />
        ))}
      </div>
    </div>
  );
}


function MessageRow({
  message,
  variant,
  user,
  onPick,
}: {
  message: AssistantMessage;
  variant: Variant;
  user?: Pick<User, 'fullName' | 'avatarUrl'> | null;
  onPick: (q: string) => void;
}) {
  const t = useTranslations('assistant');
  const isUser = message.role === 'user';

  if (variant === 'page') {
    return (
      <div className="flex gap-3">
        {isUser ? (
          <Avatar name={user?.fullName ?? 'You'} src={user?.avatarUrl} size="sm" className="mt-0.5" />
        ) : (
          <AssistantAvatar size={32} className="mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-bold text-ink">{isUser ? t('you') : t('assistantLabel')}</p>
          {isUser ? (
            <p className="inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-ss-sm bg-primary px-3.5 py-2 text-sm text-white shadow-sm">
              {message.text}
            </p>
          ) : (
            <AssistantAnswer message={message} onPick={onPick} />
          )}
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-ee-sm bg-primary px-3.5 py-2 text-sm text-white shadow-sm">
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <AssistantAvatar size={32} />
      <div className="min-w-0 flex-1">
        <div className="max-w-[92%] rounded-2xl rounded-ss-md border border-line bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm">
          <AssistantAnswer message={message} onPick={onPick} />
        </div>
      </div>
    </div>
  );
}

function AssistantAnswer({ message, onPick }: { message: AssistantMessage; onPick: (q: string) => void }) {
  const t = useTranslations('assistant');
  const sources = message.sources ?? [];
  const suggestions = message.suggestions ?? [];
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {message.offline && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[12px] font-medium text-amber-700">
          <WifiOff size={14} className="mt-0.5 shrink-0" />
          <span>{t('offlineNotice')}</span>
        </div>
      )}
      <p className="whitespace-pre-wrap break-words">{message.text}</p>

      {sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('sourcesTitle')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <SourceCard key={s.id} source={s} onClick={() => onPick(s.question)} />
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {suggestions.map((q) => (
            <SuggestionChip key={q} label={q} onClick={() => onPick(q)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypingRow({ variant, label }: { variant: Variant; label: string }) {
  return (
    <div className="flex gap-2.5" aria-label={label}>
      <AssistantAvatar size={32} />
      <div
        className={cn(
          'flex items-center gap-1 rounded-2xl rounded-ss-md px-4 py-3.5 shadow-sm',
          variant === 'page' ? 'bg-white border border-line' : 'border border-line bg-white',
        )}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}


export function AssistantAvatar({
  size = 32,
  status,
  className,
}: {
  size?: number;
  /** Shows a status dot: emerald when online, amber when the AI backend is offline. */
  status?: 'online' | 'offline';
  className?: string;
}) {
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Bot size={Math.round(size * 0.56)} />
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
            status === 'online' ? 'bg-emerald-500' : 'bg-amber-500',
          )}
        />
      )}
    </span>
  );
}

function SourceCard({ source, onClick }: { source: AssistantSource; onClick: () => void }) {
  const t = useTranslations('assistant');
  const className =
    'group flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 text-start transition-colors hover:border-primary-200 hover:bg-primary-50/50';
  const inner = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
        <BookOpen size={15} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-ink">{source.question}</span>
        <span className="block text-[11px] text-muted">{source.url ? t('sourceDoc') : 'FAQ'}</span>
      </span>
      <ArrowUpRight size={15} className="shrink-0 text-slate-300 transition-colors group-hover:text-primary" />
    </>
  );
  // RAG citations carry a link → navigate; keyword-FAQ sources re-ask the question.
  if (source.url) {
    return (
      <Link href={source.url} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

export function StarterCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-start shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border border-primary-100 bg-primary-50/70 px-3 py-1.5 text-start text-xs font-medium text-primary-700',
        'transition-colors hover:border-primary-200 hover:bg-primary-100',
      )}
    >
      {label}
    </button>
  );
}
