'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type { AssignmentInput, ReportFilters } from '@/types';

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', filters],
    queryFn: () => services.management.report(filters),
    placeholderData: keepPreviousData,
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: () => services.management.assignments(),
  });
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => services.management.assignableUsers(),
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignmentInput) => services.management.createAssignment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.management.deleteAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useAuditLog(page: number) {
  return useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => services.management.auditLog(page),
    placeholderData: keepPreviousData,
  });
}
