'use client';

import { Hash, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/auth-context';
import { useRoomMessages, useRooms } from '@/hooks/use-community';
import { services } from '@/services';
import { cn } from '@/lib/utils';
import type { ChatMessage, RoomConnection } from '@/types';

export default function CommunityPage() {
  const t = useTranslations('community');
  const tc = useTranslations('common');
  const { data: rooms, isPending } = useRooms();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (rooms && rooms.length && !active) setActive(rooms[0].slug);
  }, [rooms, active]);

  if (isPending || !rooms) return <LoadingState label={tc('loading')} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('rooms')}
            </p>
            <ul className="space-y-0.5">
              {rooms.map((r) => (
                <li key={r.slug}>
                  <button
                    onClick={() => setActive(r.slug)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      active === r.slug
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <Hash size={16} className={active === r.slug ? 'text-primary' : 'text-slate-400'} />
                    <span className="flex-1 truncate text-start">{r.name}</span>
                    <span className="text-xs text-muted">{r.messageCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {active && <RoomView key={active} slug={active} />}
      </div>
    </div>
  );
}

function RoomView({ slug }: { slug: string }) {
  const t = useTranslations('community');
  const tRoles = useTranslations('roles');
  const locale = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const { data: history, isPending } = useRoomMessages(slug);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const connRef = useRef<RoomConnection | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isStaff = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    const conn = services.community.connectRoom(slug, {
      onMessage: (m) =>
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      onDeleted: (id) => setMessages((prev) => prev.filter((x) => x.id !== id)),
      onError: (code) => {
        if (code === 'banned') toast.error(t('banned'));
      },
    });
    connRef.current = conn;
    return () => conn.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    connRef.current?.send(body);
    setDraft('');
  };

  return (
    <Card className="flex h-[calc(100vh-13rem)] min-h-[380px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 scrollbar-slim">
        {isPending ? (
          <LoadingState />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessagesSquare} title={t('emptyRoom')} description={t('emptyRoomHint')} />
        ) : (
          messages.map((m) => (
            <div key={m.id} className="group flex gap-2.5">
              <Avatar name={m.authorName} src={m.authorAvatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{m.authorName}</span>
                  {m.authorRole !== 'user' && (
                    <Badge tone="primary">{tRoles(m.authorRole)}</Badge>
                  )}
                  <span className="text-xs text-muted">
                    {new Date(m.createdAt).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {(isStaff || m.authorId === user?.id) && (
                    <button
                      onClick={() => connRef.current?.remove(m.id)}
                      className="text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                      aria-label={t('deleteMessage')}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-600">{m.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t('messagePlaceholder')}
          className="h-11 flex-1 rounded-xl border border-line bg-slate-50 px-4 text-sm placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <Button onClick={send} disabled={!draft.trim()} aria-label={t('sendMessage')}>
          <Send size={16} />
        </Button>
      </div>
    </Card>
  );
}
