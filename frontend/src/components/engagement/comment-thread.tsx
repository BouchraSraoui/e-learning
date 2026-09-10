'use client';

import { CornerDownRight, EyeOff, MessageSquare, Send, SmilePlus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';
import { useAuth } from '@/context/auth-context';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useModerateComment,
  useReactComment,
} from '@/hooks/use-comments';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types';

const EMOJIS = ['👍', '❤️', '🎉', '💡', '🔥', '👏'];

export function CommentThread({
  courseSlug,
  lessonId,
}: {
  courseSlug: string;
  lessonId?: string | null;
}) {
  const t = useTranslations('comments');
  const { user } = useAuth();
  const { data: comments = [], isPending } = useComments(courseSlug, lessonId);
  const add = useAddComment(courseSlug, lessonId);
  const [draft, setDraft] = useState('');

  const isStaff = user?.role === 'manager' || user?.role === 'admin';
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    add.mutate({ body }, { onSuccess: () => setDraft('') });
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <Avatar name={user?.fullName ?? ''} src={user?.avatarUrl} size="sm" />
        <div className="flex-1 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('placeholder')}
            rows={2}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} loading={add.isPending} disabled={!draft.trim()}>
              <Send size={15} />
              {t('post')}
            </Button>
          </div>
        </div>
      </div>

      {isPending ? null : roots.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <ul className="space-y-5">
          {roots.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentCard
                comment={c}
                courseSlug={courseSlug}
                lessonId={lessonId}
                isStaff={isStaff}
                currentUserId={user?.id}
                canReply
              />
              {repliesOf(c.id).length > 0 && (
                <ul className="space-y-3 ps-6 ms-3 border-s border-line">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentCard
                        comment={r}
                        courseSlug={courseSlug}
                        lessonId={lessonId}
                        isStaff={isStaff}
                        currentUserId={user?.id}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  courseSlug,
  lessonId,
  isStaff,
  currentUserId,
  canReply = false,
}: {
  comment: Comment;
  courseSlug: string;
  lessonId?: string | null;
  isStaff: boolean;
  currentUserId?: string;
  canReply?: boolean;
}) {
  const t = useTranslations('comments');
  const tRoles = useTranslations('roles');
  const locale = useLocale();
  const react = useReactComment(courseSlug, lessonId);
  const del = useDeleteComment(courseSlug, lessonId);
  const moderate = useModerateComment(courseSlug, lessonId);
  const addReply = useAddComment(courseSlug, lessonId);

  const [showEmoji, setShowEmoji] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');

  const isAuthor = currentUserId === comment.authorId;
  const canDelete = isAuthor || isStaff;
  const date = new Date(comment.createdAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  const submitReply = () => {
    const body = reply.trim();
    if (!body) return;
    addReply.mutate(
      { body, parentId: comment.id },
      {
        onSuccess: () => {
          setReply('');
          setReplyOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex gap-3">
      <Avatar name={comment.authorName} src={comment.authorAvatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{comment.authorName}</span>
          {comment.authorRole !== 'user' && (
            <Badge tone="primary">{tRoles(comment.authorRole)}</Badge>
          )}
          {comment.isHidden && <Badge tone="warning">{t('hidden')}</Badge>}
          <span className="text-xs text-muted">{date}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{comment.body}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => react.mutate({ id: comment.id, emoji: r.emoji })}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                r.reacted
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-line text-slate-500 hover:bg-slate-50',
              )}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}

          <div className="relative">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="grid h-7 w-7 place-items-center rounded-full border border-line text-slate-400 hover:bg-slate-50"
              aria-label={t('react')}
            >
              <SmilePlus size={14} />
            </button>
            {showEmoji && (
              <div className="absolute z-10 mt-1 flex gap-1 rounded-xl border border-line bg-white p-1.5 shadow-pop">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      react.mutate({ id: comment.id, emoji: e });
                      setShowEmoji(false);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-base hover:bg-slate-100"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canReply && (
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted hover:text-primary"
            >
              <CornerDownRight size={13} />
              {t('reply')}
            </button>
          )}
          {isStaff && (
            <button
              onClick={() => moderate.mutate({ id: comment.id, hidden: !comment.isHidden })}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted hover:text-amber-600"
            >
              <EyeOff size={13} />
              {comment.isHidden ? t('unhide') : t('hide')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => del.mutate(comment.id)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted hover:text-rose-600"
            >
              <Trash2 size={13} />
              {t('delete')}
            </button>
          )}
        </div>

        {replyOpen && (
          <div className="mt-2 flex gap-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t('replyPlaceholder')}
              rows={1}
            />
            <Button size="sm" onClick={submitReply} loading={addReply.isPending} disabled={!reply.trim()}>
              <Send size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
