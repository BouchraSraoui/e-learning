import django_filters

from .models import User


class UserFilter(django_filters.FilterSet):
    class Meta:
        model = User
        fields = {
            'role': ['exact'],
            'department': ['exact'],
            'is_active': ['exact'],
        }
