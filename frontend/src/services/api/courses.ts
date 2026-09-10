import type {
  CourseDetail,
  CourseFilters,
  CourseInput,
  CourseSummary,
  LandingPreview,
  LessonInput,
  ModuleInput,
  Paginated,
  ResourceInput,
} from '@/types';
import { http } from '../http';
import {
  mapCourseDetail,
  mapCourseSummary,
  mapPaginated,
  toCoursePayload,
  toModulePayload,
} from './mappers';

function toParams(filters: CourseFilters = {}): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.category) params.category = filters.category;
  if (filters.level) params.level = filters.level;
  if (filters.contentType) params.content_type = filters.contentType;
  if (filters.duration) params.duration = filters.duration;
  if (filters.mandatory !== undefined) params.is_mandatory = filters.mandatory;
  if (filters.mine) params.mine = true;
  if (filters.ordering) params.ordering = filters.ordering;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.page_size = filters.pageSize;
  return params;
}

export const coursesService = {
  async list(filters: CourseFilters = {}): Promise<Paginated<CourseSummary>> {
    const { data } = await http.get('/courses/', { params: toParams(filters) });
    return mapPaginated(data, mapCourseSummary);
  },

  /** Public, unauthenticated — feeds the landing hero card. */
  async landingPreview(): Promise<LandingPreview> {
    const { data } = await http.get('/courses/landing-preview/');
    return {
      categories: data.categories ?? [],
      courses: data.courses ?? [],
      path: data.path ?? null,
    };
  },

  async getBySlug(slug: string): Promise<CourseDetail> {
    const { data } = await http.get(`/courses/${slug}/`);
    return mapCourseDetail(data);
  },


  async adminList(filters: CourseFilters = {}): Promise<Paginated<CourseSummary>> {
    const { data } = await http.get('/courses/', { params: toParams(filters) });
    return mapPaginated(data, mapCourseSummary);
  },

  async adminGetBySlug(slug: string): Promise<CourseDetail> {
    const { data } = await http.get(`/courses/${slug}/`);
    return mapCourseDetail(data);
  },

  async createCourse(input: CourseInput): Promise<CourseDetail> {
    const { data } = await http.post('/courses/', toCoursePayload(input));
    return mapCourseDetail(data);
  },

  async updateCourse(slug: string, input: Partial<CourseInput>): Promise<CourseDetail> {
    const { data } = await http.patch(`/courses/${slug}/`, toCoursePayload(input as CourseInput));
    return mapCourseDetail(data);
  },

  async deleteCourse(slug: string): Promise<void> {
    await http.delete(`/courses/${slug}/`);
  },

  async uploadThumbnail(slug: string, file: File): Promise<CourseDetail> {
    const form = new FormData();
    form.append('thumbnail', file);
    const { data } = await http.patch(`/courses/${slug}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapCourseDetail(data);
  },

  async createModule(input: ModuleInput): Promise<{ id: string }> {
    const { data } = await http.post('/modules/', toModulePayload(input));
    return { id: String(data.id) };
  },

  async updateModule(id: string, input: Partial<ModuleInput>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title;
    if (input.summary !== undefined) payload.summary = input.summary;
    if (input.order !== undefined) payload.order = input.order;
    await http.patch(`/modules/${id}/`, payload);
  },

  async deleteModule(id: string): Promise<void> {
    await http.delete(`/modules/${id}/`);
  },

  async createLesson(input: LessonInput): Promise<{ id: string }> {
    const { data } = input.file
      ? await http.post('/lessons/', lessonForm(input), MULTIPART)
      : await http.post('/lessons/', lessonJson(input));
    return { id: String(data.id) };
  },

  async updateLesson(id: string, input: LessonInput): Promise<void> {
    if (input.file) await http.patch(`/lessons/${id}/`, lessonForm(input), MULTIPART);
    else await http.patch(`/lessons/${id}/`, lessonJson(input));
  },

  async deleteLesson(id: string): Promise<void> {
    await http.delete(`/lessons/${id}/`);
  },

  async createResource(input: ResourceInput): Promise<{ id: string }> {
    const { data } = input.file
      ? await http.post('/resources/', resourceForm(input), MULTIPART)
      : await http.post('/resources/', {
          course: Number(input.courseId),
          title: input.title,
          external_url: input.externalUrl ?? '',
        });
    return { id: String(data.id) };
  },

  async deleteResource(id: string): Promise<void> {
    await http.delete(`/resources/${id}/`);
  },
};

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function lessonJson(input: LessonInput): Record<string, unknown> {
  return {
    module: Number(input.moduleId),
    title: input.title,
    content_type: input.type,
    external_url: input.externalUrl ?? '',
    rich_text: input.richText ?? '',
    duration_minutes: input.durationMinutes,
    order: input.order,
    is_preview: input.isPreview,
  };
}

function lessonForm(input: LessonInput): FormData {
  const form = new FormData();
  Object.entries(lessonJson(input)).forEach(([k, v]) => form.append(k, String(v)));
  if (input.file) form.append('file', input.file);
  return form;
}

function resourceForm(input: ResourceInput): FormData {
  const form = new FormData();
  form.append('course', String(Number(input.courseId)));
  form.append('title', input.title);
  form.append('external_url', input.externalUrl ?? '');
  if (input.file) form.append('file', input.file);
  return form;
}
