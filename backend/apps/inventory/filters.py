from django_filters import rest_framework as filters
from django.db.models import F

from .models import Category, Stock, Product, StockMovement


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(field_name='name', lookup_expr='icontains')
    sku = filters.CharFilter(field_name='sku', lookup_expr='icontains')
    is_active = filters.BooleanFilter(field_name='is_active')
    unit_of_measure = filters.CharFilter(field_name='unit_of_measure', lookup_expr='iexact')
    category = filters.NumberFilter(field_name='category__id')
    category_name = filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    
    class Meta:
        model = Product
        fields = ['name', 'sku', 'is_active', 'unit_of_measure', 'category', 'category_name']
        
        
class StockFilter(filters.FilterSet):
    product = filters.NumberFilter(field_name='product__id')
    product_sku = filters.CharFilter(field_name='product__sku', lookup_expr='icontains')
    location = filters.NumberFilter(field_name='location__id')
    warehouse = filters.NumberFilter(field_name='location__rack__floor__warehouse__id')
    low_stock = filters.BooleanFilter(method='filter_low_stock')
    
    def filter_low_stock(self, queryset, name, value):
        if value:
            return queryset.filter(quantity__lte=F('product__reorder_point'))
        return queryset
    
    class Meta:
        model = Stock
        fields = ['product', 'product_sku', 'location', 'warehouse', 'low_stock']
        
        

class StockMovementFilter(filters.FilterSet):
    stock = filters.NumberFilter()
    movement_type = filters.ChoiceFilter(choices=StockMovement.MovementType.choices)
    user = filters.NumberFilter(field_name='user__id')
    start_date = filters.DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    end_date = filters.DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    reference_id = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = StockMovement
        fields = ['stock', 'movement_type', 'user', 'start_date', 'end_date', 'reference_id']


class CategoryFilter(filters.FilterSet):
    name = filters.CharFilter(field_name='name', lookup_expr='icontains')

    class Meta:
        model = Category
        fields = ['name']