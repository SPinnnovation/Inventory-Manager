import django_filters

from .models import User

class UserFilter(django_filters.FilterSet):
    email = django_filters.CharFilter(lookup_expr='icontains')
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    role = django_filters.ChoiceFilter(choices=User.Role.choices)
    is_active = django_filters.BooleanFilter()
    is_staff = django_filters.BooleanFilter()

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']