from django.contrib import admin

from .models import (
    Category,
    Course,
    LearningPath,
    LearningPathItem,
    Lesson,
    Module,
    Resource,
)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ['title', 'content_type', 'file', 'external_url', 'duration_minutes', 'order', 'is_preview']


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1
    fields = ['title', 'order']
    show_change_link = True


class ResourceInline(admin.TabularInline):
    model = Resource
    extra = 1


class LearningPathItemInline(admin.TabularInline):
    model = LearningPathItem
    extra = 1
    autocomplete_fields = ['course']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'accent', 'order']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'level', 'primary_format', 'is_mandatory', 'is_published']
    list_filter = ['is_published', 'is_mandatory', 'level', 'primary_format', 'category']
    search_fields = ['title', 'summary', 'description']
    prepopulated_fields = {'slug': ('title',)}
    autocomplete_fields = ['category', 'author', 'prerequisites']
    inlines = [ModuleInline, ResourceInline]


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    search_fields = ['title']
    inlines = [LessonInline]


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_published']
    search_fields = ['title']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [LearningPathItemInline]
