from django.contrib import admin

from .models import Certificate, Enrollment, LessonProgress


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'status', 'progress', 'enrolled_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'course__title')
    raw_id_fields = ('user', 'course', 'last_lesson')


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'lesson', 'completed', 'time_spent_seconds')
    list_filter = ('completed',)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('code', 'holder_name', 'course_title', 'issued_at', 'is_valid')
    search_fields = ('code', 'holder_name', 'course_title')
    readonly_fields = ('code', 'signature', 'issued_at')
