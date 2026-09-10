'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { useAskAssistant } from '@/hooks/use-assistant';
import type { AssistantMessage, AssistantTurn } from '@/types';

let msgSeq = 0;
const nextMsgId = () => `msg-${(msgSeq += 1)}`;

// How many prior turns to send along for context. The backend caps this again;
// keeping it small here just avoids shipping a whole transcript on every ask.
const HISTORY_TURNS = 6;

export function useAssistantChat() {
  const t = useTranslations('assistant');
  const ask = useAskAssistant();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  // Whether the AI backend is currently unreachable. Optimistic to start; each
  // reply updates it from the strongest evidence available (see below).
  const [offline, setOffline] = useState(false);
  // Mirror of `messages` so `submit` reads the latest turns without being
  // recreated on every message (which would churn every consumer of `submit`).
  const messagesRef = useRef<AssistantMessage[]>([]);
  messagesRef.current = messages;

  const submit = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || ask.isPending) return;
      setDraft('');
      // Snapshot the conversation so far (before this question) as context. Error
      // bubbles from a failed request carry no `intent`; skip them so a transient
      // "something went wrong" is never replayed to the model as a real answer.
      const history: AssistantTurn[] = messagesRef.current
        .filter((m) => m.role === 'user' || m.intent != null)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.text }));
      setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', text: q }]);
      try {
        const reply = await ask.mutateAsync({ question: q, history });
        // A grounded 'rag' answer proves the backend is up; an 'offline' answer
        // proves it's down. Greetings and errors are backend-agnostic, so they
        // leave the last known status unchanged.
        if (reply.intent === 'rag') setOffline(false);
        else if (reply.offline) setOffline(true);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMsgId(),
            role: 'assistant',
            text: reply.answer,
            intent: reply.intent,
            sources: reply.sources,
            suggestions: reply.suggestions,
            offline: reply.offline,
          },
        ]);
      } catch {
        setMessages((prev) => [...prev, { id: nextMsgId(), role: 'assistant', text: t('errorReply') }]);
      }
    },
    [ask, t],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setDraft('');
    setOffline(false);
  }, []);

  return {
    messages,
    draft,
    setDraft,
    submit,
    reset,
    offline,
    pending: ask.isPending,
    empty: messages.length === 0,
  };
}

export type AssistantChat = ReturnType<typeof useAssistantChat>;
