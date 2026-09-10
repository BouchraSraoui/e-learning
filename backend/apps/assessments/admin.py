from django.contrib import admin

from .models import Answer, Question, Quiz, QuizAttempt


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 2


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'module', 'pass_score', 'max_attempts', 'is_published')
    list_filter = ('is_published',)
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'quiz', 'type', 'points', 'order')
    list_filter = ('type',)
    inlines = [AnswerInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz', 'attempt_number', 'score', 'passed', 'submitted_at')
    list_filter = ('passed',)
