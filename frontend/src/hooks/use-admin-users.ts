'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type { AdminUserFilters, AdminUserInput } from '@/types';

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => services.users.adminList(filters),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin-users'] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: AdminUserInput) => services.users.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserInput }) =>
      services.users.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => services.users.remove(id),
    onSuccess: invalidate,
  });
}

export function useImportUsers() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (file: File) => services.users.importUsers(file),
    onSuccess: invalidate,
  });
}
