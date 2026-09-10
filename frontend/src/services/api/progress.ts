import type { Enrollment, Lesson, LessonProgressInput } from '@/types';
import { http, netModeStore, tokenStore } from '../http';
import { mapEnrollment } from './mappers';

const NET_DEMO = process.env.NEXT_PUBLIC_NET_DEMO === 'true';

export const progressService = {
  async myEnrollments(): Promise<Enrollment[]> {
    const { data } = await http.get('/enrollments/');
    return (data as unknown[]).map((e) => mapEnrollment(e as never));
  },

  async getEnrollment(slug: string): Promise<Enrollment | null> {
    try {
      const { data } = await http.get(`/enrollments/${slug}/`);
      return mapEnrollment(data);
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status === 404) return null;
      throw err;
    }
  },

  async enroll(slug: string): Promise<Enrollment> {
    const { data } = await http.post('/enrollments/', { course: slug });
    return mapEnrollment(data);
  },

  async saveLessonProgress(lessonId: string, input: LessonProgressInput): Promise<Enrollment> {
    const { data } = await http.post(`/lessons/${lessonId}/progress/`, {
      resume_position_seconds: input.resumePositionSeconds,
      time_spent_seconds: input.timeSpentSeconds,
      completed: input.completed,
    });
    return mapEnrollment(data);
  },

  resolveMediaUrl(lesson: Lesson, opts?: { download?: boolean }): string {
    if (!lesson.fileUrl) return lesson.externalUrl;
    const params = new URLSearchParams();
    const token = tokenStore.access;
    if (token) params.set('token', token);
    if (opts?.download) params.set('download', '1');
    // Native browser media/download requests can't send the X-Access-Mode header, so
    // in demo mode pass the simulated origin as a query param (backend honours ?net=
    // under DEBUG). Production ignores it and uses the real client IP.
    if (NET_DEMO) params.set('net', netModeStore.mode);
    const qs = params.toString();
    if (!qs) return lesson.fileUrl;
    const sep = lesson.fileUrl.includes('?') ? '&' : '?';
    return `${lesson.fileUrl}${sep}${qs}`;
  },
};
