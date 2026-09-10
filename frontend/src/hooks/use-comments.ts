'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';

function commentsKey(courseSlug: string, lessonId?: string | null) {
  return ['comments', courseSlug, lessonId ?? null] as const;
}

export function useComments(courseSlug: string, lessonId?: string | null) {
  return useQuery({
    queryKey: commentsKey(courseSlug, lessonId),
    queryFn: () => services.engagement.listComments(courseSlug, lessonId ?? null),
    enabled: Boolean(courseSlug),
  });
}

export function useAddComment(courseSlug: string, lessonId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: string | null }) =>
      services.engagement.addComment({ courseSlug, lessonId: lessonId ?? null, body, parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(courseSlug, lessonId) });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });
}

export function useDeleteComment(courseSlug: string, lessonId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.engagement.deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey(courseSlug, lessonId) }),
  });
}

export function useModerateComment(courseSlug: string, lessonId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      services.engagement.moderateComment(id, hidden),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey(courseSlug, lessonId) }),
  });
}

export function useReactComment(courseSlug: string, lessonId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      services.engagement.reactToComment(id, emoji),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey(courseSlug, lessonId) }),
  });
}
