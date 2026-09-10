import type {
  AdminQuiz,
  Quiz,
  QuizAttemptResult,
  QuizInput,
  QuizResponses,
} from '@/types';
import { http } from '../http';
import { mapAdminQuiz, mapAttemptResult, mapQuiz, toQuizPayload } from './mappers';

export const assessmentsService = {
  async getQuiz(id: string): Promise<Quiz> {
    const { data } = await http.get(`/quizzes/${id}/`);
    return mapQuiz(data);
  },

  async submitAttempt(id: string, responses: QuizResponses): Promise<QuizAttemptResult> {
    const { data } = await http.post(`/quizzes/${id}/attempts/`, { responses });
    return mapAttemptResult(data);
  },

  async myAttempts(id: string): Promise<QuizAttemptResult[]> {
    const { data } = await http.get(`/quizzes/${id}/attempts/`);
    return (data as unknown[]).map((a) => mapAttemptResult(a as never));
  },


  async listQuizzes(courseId: string): Promise<AdminQuiz[]> {
    const { data } = await http.get('/admin/quizzes/', { params: { course: courseId } });
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapAdminQuiz);
  },

  async createQuiz(input: QuizInput): Promise<AdminQuiz> {
    const { data } = await http.post('/admin/quizzes/', toQuizPayload(input));
    return mapAdminQuiz(data);
  },

  async updateQuiz(id: string, input: QuizInput): Promise<AdminQuiz> {
    const { data } = await http.put(`/admin/quizzes/${id}/`, toQuizPayload(input));
    return mapAdminQuiz(data);
  },

  async deleteQuiz(id: string): Promise<void> {
    await http.delete(`/admin/quizzes/${id}/`);
  },
};
