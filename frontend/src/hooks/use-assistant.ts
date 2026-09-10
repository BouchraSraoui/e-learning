'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { services } from '@/services';
import type { AssistantTurn, FaqInput } from '@/types';

export function useFaqs() {
  const locale = useLocale();
  return useQuery({
    queryKey: ['faqs', locale],
    queryFn: () => services.assistant.faqs(),
  });
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: ({ question, history }: { question: string; history?: AssistantTurn[] }) =>
      services.assistant.ask(question, history),
  });
}


export function useAdminFaqs() {
  return useQuery({
    queryKey: ['admin-faqs'],
    queryFn: () => services.assistant.adminFaqs(),
  });
}

export function useSaveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FaqInput }) =>
      id ? services.assistant.updateFaq(id, input) : services.assistant.createFaq(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.assistant.deleteFaq(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
  });
}
