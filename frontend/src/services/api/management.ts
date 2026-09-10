import type {
  AssignableUser,
  Assignment,
  AssignmentInput,
  AuditEntry,
  DownloadFile,
  Paginated,
  ReportFilters,
  ReportResult,
} from '@/types';
import { http } from '../http';
import { mapAssignment, mapAuditEntry, mapPaginated, mapReportRow } from './mappers';

function toReportParams(f: ReportFilters = {}): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.department) params.department = f.department;
  if (f.course) params.course = f.course;
  if (f.status) params.status = f.status;
  if (f.dateFrom) params.date_from = f.dateFrom;
  if (f.dateTo) params.date_to = f.dateTo;
  return params;
}

function filenameFrom(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export const managementService = {
  async report(filters: ReportFilters = {}): Promise<ReportResult> {
    const { data } = await http.get('/admin/reports/', { params: toReportParams(filters) });
    return { count: data.count, rows: (data.rows ?? []).map(mapReportRow) };
  },

  async exportReport(fmt: 'csv' | 'xlsx' | 'pdf', filters: ReportFilters = {}): Promise<DownloadFile> {
    const res = await http.get('/admin/reports/export/', {
      params: { ...toReportParams(filters), fmt },
      responseType: 'blob',
    });
    return {
      blob: res.data as Blob,
      filename: filenameFrom(res.headers['content-disposition'], `training-report.${fmt}`),
    };
  },

  async assignments(): Promise<Assignment[]> {
    const { data } = await http.get('/assignments/');
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    return rows.map(mapAssignment);
  },

  async assignableUsers(): Promise<AssignableUser[]> {
    const { data } = await http.get('/assignments/assignable-users/');
    return (data as Array<{ id: number | string; name: string; email: string }>).map((u) => ({
      id: String(u.id),
      name: u.name,
      email: u.email,
    }));
  },

  async createAssignment(input: AssignmentInput): Promise<Assignment> {
    const { data } = await http.post('/assignments/', {
      user: Number(input.userId),
      course: Number(input.courseId),
      due_date: input.dueDate || null,
      note: input.note ?? '',
    });
    return mapAssignment(data);
  },

  async deleteAssignment(id: string): Promise<void> {
    await http.delete(`/assignments/${id}/`);
  },

  async auditLog(page = 1): Promise<Paginated<AuditEntry>> {
    const { data } = await http.get('/admin/audit/', { params: { page } });
    return mapPaginated(data, mapAuditEntry);
  },
};
