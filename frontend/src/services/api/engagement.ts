import type {
  Badge,
  Comment,
  CommentInput,
  CourseFeedback,
  Feedback,
  FeedbackInput,
  Leaderboard,
  LeaderboardScope,
} from '@/types';
import { http } from '../http';
import {
  mapBadge,
  mapComment,
  mapCourseFeedback,
  mapFeedback,
  mapLeaderboard,
} from './mappers';

export const engagementService = {
  async listComments(courseSlug: string, lessonId?: string | null): Promise<Comment[]> {
    const params: Record<string, string> = { course: courseSlug };
    if (lessonId) params.lesson = lessonId;
    const { data } = await http.get('/comments/', { params });
    return (data as unknown[]).map((c) => mapComment(c as never));
  },

  async addComment(input: CommentInput): Promise<Comment> {
    const { data } = await http.post('/comments/', {
      course: input.courseSlug,
      lesson: input.lessonId ?? undefined,
      parent: input.parentId ?? undefined,
      body: input.body,
    });
    return mapComment(data);
  },

  async deleteComment(id: string): Promise<void> {
    await http.delete(`/comments/${id}/`);
  },

  async moderateComment(id: string, hidden: boolean): Promise<Comment> {
    const { data } = await http.post(`/comments/${id}/moderate/`, { hidden });
    return mapComment(data);
  },

  async reactToComment(id: string, emoji: string): Promise<Comment> {
    const { data } = await http.post(`/comments/${id}/react/`, { emoji });
    return mapComment(data);
  },

  async getFeedback(courseSlug: string): Promise<CourseFeedback> {
    const { data } = await http.get(`/courses/${courseSlug}/feedback/`);
    return mapCourseFeedback(data);
  },

  async submitFeedback(courseSlug: string, input: FeedbackInput): Promise<Feedback> {
    const { data } = await http.post(`/courses/${courseSlug}/feedback/`, {
      rating: input.rating,
      comment: input.comment ?? '',
    });
    return mapFeedback(data);
  },

  async listBadges(): Promise<Badge[]> {
    const { data } = await http.get('/badges/');
    return (data as unknown[]).map((b) => mapBadge(b as never));
  },

  async leaderboard(scope: LeaderboardScope = 'all'): Promise<Leaderboard> {
    const { data } = await http.get('/leaderboard/', { params: { scope } });
    return mapLeaderboard(data);
  },
};
