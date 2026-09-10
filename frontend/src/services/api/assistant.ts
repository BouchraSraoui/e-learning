import type { AssistantReply, AssistantTurn, FaqEntry, FaqInput } from '@/types';
import { http } from '../http';
import { mapAssistantReply, mapFaqEntry, toFaqPayload } from './mappers';

export const assistantService = {
  async faqs(): Promise<FaqEntry[]> {
    const { data } = await http.get('/faq/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapFaqEntry);
  },

  async ask(question: string, history: AssistantTurn[] = []): Promise<AssistantReply> {
    const { data } = await http.post('/assistant/ask/', { question, history });
    return mapAssistantReply(data);
  },

  async adminFaqs(): Promise<FaqEntry[]> {
    const { data } = await http.get('/admin/faq/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapFaqEntry);
  },

  async createFaq(input: FaqInput): Promise<FaqEntry> {
    const { data } = await http.post('/admin/faq/', toFaqPayload(input));
    return mapFaqEntry(data);
  },

  async updateFaq(id: string, input: FaqInput): Promise<FaqEntry> {
    const { data } = await http.patch(`/admin/faq/${id}/`, toFaqPayload(input));
    return mapFaqEntry(data);
  },

  async deleteFaq(id: string): Promise<void> {
    await http.delete(`/admin/faq/${id}/`);
  },
};
