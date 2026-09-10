import django_filters
from django.db.models import Q

from .models import ContentType, Course, Level


class CourseFilter(django_filters.FilterSet):

    category = django_filters.NumberFilter(field_name='category_id')
    category_slug = django_filters.CharFilter(field_name='category__slug')
    level = django_filters.ChoiceFilter(choices=Level.choices)
    is_mandatory = django_filters.BooleanFilter()
    content_type = django_filters.ChoiceFilter(
        choices=ContentType.choices, method='filter_content_type'
    )
    duration = django_filters.ChoiceFilter(
        choices=[('short', 'short'), ('medium', 'medium'), ('long', 'long')],
        method='filter_duration',
    )

    class Meta:
        model = Course
        fields = ['category', 'category_slug', 'level', 'is_mandatory', 'content_type', 'duration']

    def filter_content_type(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(primary_format=value) | Q(modules__lessons__content_type=value)
        ).distinct()

    def filter_duration(self, queryset, name, value):
        if value == 'short':
            return queryset.filter(duration_minutes__lt=30)
        if value == 'medium':
            return queryset.filter(duration_minutes__gte=30, duration_minutes__lte=120)
        if value == 'long':
            return queryset.filter(duration_minutes__gt=120)
        return queryset
