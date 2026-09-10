from __future__ import annotations

import csv
import io
from datetime import date

from apps.accounts.models import Role

from .models import Enrollment


def _valid_date(value):
    try:
        return date.fromisoformat(value) if value else None
    except (ValueError, TypeError):
        return None

REPORT_COLUMNS = [
    'user_name', 'user_email', 'department', 'course_title',
    'status', 'progress', 'enrolled_at', 'completed_at',
]
_XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


def scope_enrollments(user):
    qs = Enrollment.objects.select_related('user', 'course', 'user__department')
    if getattr(user, 'is_admin_role', False):
        return qs
    if user.role == Role.MANAGER:
        if user.department_id:
            return qs.filter(user__department_id=user.department_id)
        return qs.filter(user__manager_id=user.id)
    return qs.none()


def build_report(user, params) -> list[dict]:
    qs = scope_enrollments(user)
    department = params.get('department')
    course = params.get('course')
    status = params.get('status')
    date_from = params.get('date_from')
    date_to = params.get('date_to')

    if department and str(department).isdigit():
        qs = qs.filter(user__department_id=department)
    if course:
        qs = qs.filter(course__slug=course)
    if status in {'not_started', 'in_progress', 'completed'}:
        qs = qs.filter(status=status)
    parsed_from = _valid_date(date_from)
    if parsed_from:
        qs = qs.filter(enrolled_at__date__gte=parsed_from)
    parsed_to = _valid_date(date_to)
    if parsed_to:
        qs = qs.filter(enrolled_at__date__lte=parsed_to)

    rows = []
    for e in qs.order_by('user__first_name', 'user__last_name', 'course__title'):
        rows.append({
            'user_name': e.user.full_name,
            'user_email': e.user.email,
            'department': e.user.department.name if e.user.department_id else '',
            'course_title': e.course.title,
            'course_slug': e.course.slug,
            'status': e.status,
            'progress': e.progress,
            'enrolled_at': e.enrolled_at.date().isoformat(),
            'completed_at': e.completed_at.date().isoformat() if e.completed_at else '',
        })
    return rows


def _row_values(row: dict) -> list:
    return [
        row['user_name'], row['user_email'], row['department'], row['course_title'],
        row['status'], f'{row["progress"]}%', row['enrolled_at'], row['completed_at'],
    ]


def _export_csv(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(REPORT_COLUMNS)
    for row in rows:
        writer.writerow(_row_values(row))
    return buf.getvalue().encode('utf-8-sig')


def _export_xlsx(rows: list[dict]) -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = 'Report'
    ws.append(REPORT_COLUMNS)
    for row in rows:
        ws.append(_row_values(row))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _export_pdf(rows: list[dict]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), title='Training report')
    styles = getSampleStyleSheet()
    elements = [Paragraph('Icosnet — Training Report', styles['Title']), Spacer(1, 12)]

    header = ['Name', 'Email', 'Department', 'Course', 'Status', 'Progress', 'Enrolled', 'Completed']
    data = [header] + [_row_values(r) for r in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)
    doc.build(elements)
    return buf.getvalue()


def report_export(rows: list[dict], fmt: str) -> tuple[bytes, str, str]:
    if fmt == 'xlsx':
        return _export_xlsx(rows), _XLSX_TYPE, 'training-report.xlsx'
    if fmt == 'pdf':
        return _export_pdf(rows), 'application/pdf', 'training-report.pdf'
    return _export_csv(rows), 'text/csv; charset=utf-8', 'training-report.csv'
