'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import type {
  CourseFilters,
  CourseInput,
  LessonInput,
  ModuleInput,
  QuizInput,
  ResourceInput,
} from '@/types';


export function useAdminCourses(filters: CourseFilters) {
  return useQuery({
    queryKey: ['admin-courses', filters],
    queryFn: () => services.courses.adminList(filters),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCourse(slug: string) {
  return useQuery({
    queryKey: ['admin-course', slug],
    queryFn: () => services.courses.adminGetBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useCourseQuizzes(courseId: string) {
  return useQuery({
    queryKey: ['admin-quizzes', courseId],
    queryFn: () => services.assessments.listQuizzes(courseId),
    enabled: Boolean(courseId),
  });
}


function useInvalidateCourses() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin-courses'] });
}

export function useCreateCourse() {
  const invalidate = useInvalidateCourses();
  return useMutation({
    mutationFn: (input: CourseInput) => services.courses.createCourse(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCourse() {
  const invalidate = useInvalidateCourses();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, input }: { slug: string; input: Partial<CourseInput> }) =>
      services.courses.updateCourse(slug, input),
    onSuccess: (_data, { slug }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['admin-course', slug] });
    },
  });
}

export function useDeleteCourse() {
  const invalidate = useInvalidateCourses();
  return useMutation({
    mutationFn: (slug: string) => services.courses.deleteCourse(slug),
    onSuccess: invalidate,
  });
}


export function useBuilderActions(slug: string, courseId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-course', slug] });
    qc.invalidateQueries({ queryKey: ['admin-courses'] });
  };
  const refreshQuizzes = () => qc.invalidateQueries({ queryKey: ['admin-quizzes', courseId] });
  const opts = { onSuccess: refresh };

  return {
    createModule: useMutation({ mutationFn: (i: ModuleInput) => services.courses.createModule(i), ...opts }),
    updateModule: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<ModuleInput> }) =>
        services.courses.updateModule(id, input),
      ...opts,
    }),
    deleteModule: useMutation({ mutationFn: (id: string) => services.courses.deleteModule(id), ...opts }),
    createLesson: useMutation({ mutationFn: (i: LessonInput) => services.courses.createLesson(i), ...opts }),
    updateLesson: useMutation({
      mutationFn: ({ id, input }: { id: string; input: LessonInput }) =>
        services.courses.updateLesson(id, input),
      ...opts,
    }),
    deleteLesson: useMutation({ mutationFn: (id: string) => services.courses.deleteLesson(id), ...opts }),
    createResource: useMutation({ mutationFn: (i: ResourceInput) => services.courses.createResource(i), ...opts }),
    deleteResource: useMutation({ mutationFn: (id: string) => services.courses.deleteResource(id), ...opts }),
    createQuiz: useMutation({
      mutationFn: (i: QuizInput) => services.assessments.createQuiz(i),
      onSuccess: () => {
        refresh();
        refreshQuizzes();
      },
    }),
    updateQuiz: useMutation({
      mutationFn: ({ id, input }: { id: string; input: QuizInput }) =>
        services.assessments.updateQuiz(id, input),
      onSuccess: () => {
        refresh();
        refreshQuizzes();
      },
    }),
    deleteQuiz: useMutation({
      mutationFn: (id: string) => services.assessments.deleteQuiz(id),
      onSuccess: () => {
        refresh();
        refreshQuizzes();
      },
    }),
  };
}
