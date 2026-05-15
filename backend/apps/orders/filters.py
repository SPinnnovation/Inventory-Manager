from django_filters import rest_framework as filters
from django.utils import timezone

from .models import (
    PurchaseOrder,
    PurchaseOrderItem,
    WorkOrder,
    WorkOrderItem,
)


class PurchaseOrderFilter(filters.FilterSet):
    po_number = filters.CharFilter(lookup_expr='icontains')
    supplier_name = filters.CharFilter(lookup_expr='icontains')
    status = filters.ChoiceFilter(choices=PurchaseOrder.OrderStatus.choices)
    created_by = filters.NumberFilter(field_name='created_by__id')
    expected_from = filters.DateFilter(field_name='expected_delivery_date', lookup_expr='gte')
    expected_to = filters.DateFilter(field_name='expected_delivery_date', lookup_expr='lte')
    created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    is_overdue = filters.BooleanFilter(method='filter_overdue')

    def filter_overdue(self, queryset, name, value):
        """
        Filter purchase orders that are overdue.
        """
        today = timezone.now().date()
        closed = (PurchaseOrder.OrderStatus.COMPLETED, PurchaseOrder.OrderStatus.CANCELLED)
        
        if value:
            return queryset.filter(expected_delivery_date__lt=today).exclude(status__in=closed) # Overdue: expected date in past and not closed
        return queryset

    class Meta:
        model = PurchaseOrder
        fields = ['po_number', 'supplier_name', 'status', 'created_by']


class PurchaseOrderItemFilter(filters.FilterSet):
    order = filters.NumberFilter(field_name='order__id')
    product = filters.NumberFilter(field_name='product__id')
    product_sku = filters.CharFilter(field_name='product__sku', lookup_expr='icontains')

    class Meta:
        model = PurchaseOrderItem
        fields = ['order', 'product', 'product_sku']
        
        
class WorkOrderFilter(filters.FilterSet):
    wo_number = filters.CharFilter(lookup_expr='icontains')
    title = filters.CharFilter(lookup_expr='icontains')
    status = filters.ChoiceFilter(choices=WorkOrder.WorkOrderStatus.choices)
    priority = filters.ChoiceFilter(choices=WorkOrder.Priority.choices)
    assigned_to = filters.CharFilter(lookup_expr='icontains')
    created_by = filters.NumberFilter(field_name='created_by__id')
    due_before = filters.DateFilter(field_name='due_date', lookup_expr='lte')
    due_after = filters.DateFilter(field_name='due_date', lookup_expr='gte')
    created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    is_overdue = filters.BooleanFilter(method='filter_overdue')

    def filter_overdue(self, queryset, name, value):
        """
        Filter work orders that are overdue.
        """
        today = timezone.now().date()
        terminal = (
            WorkOrder.WorkOrderStatus.COMPLETED_FULLY_USED,
            WorkOrder.WorkOrderStatus.COMPLETED_PARTIALLY_USED,
            WorkOrder.WorkOrderStatus.COMPLETED_NOT_USED,
            WorkOrder.WorkOrderStatus.CANCELLED,
        )
        if value:
            return queryset.filter(due_date__lt=today).exclude(status__in=terminal) # return overdue: due date in past and not terminal
        return queryset

    class Meta:
        model = WorkOrder
        fields = ['wo_number', 'title', 'status', 'priority', 'assigned_to', 'created_by']
        


class WorkOrderItemFilter(filters.FilterSet):
    work_order = filters.NumberFilter(field_name='work_order__id')
    product = filters.NumberFilter(field_name='product__id')
    product_sku = filters.CharFilter(field_name='product__sku', lookup_expr='icontains')

    class Meta:
        model = WorkOrderItem
        fields = ['work_order', 'product', 'product_sku']