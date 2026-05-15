from django.contrib import admin

from .models import PurchaseOrder, PurchaseOrderItem, WorkOrder, WorkOrderItem


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

class PurchaseOrderItemInline(admin.TabularInline):
    model       = PurchaseOrderItem
    extra       = 0
    fields      = [
        'product', 'destination_location',
        'quantity_ordered', 'quantity_received', 'unit_price', 'notes',
    ]
    readonly_fields = []


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display   = [
        'po_number', 'supplier_name', 'status', 'priority_marker',
        'expected_delivery_date', 'is_overdue', 'created_by', 'created_at',
    ]
    list_filter    = ['status', 'created_at', 'expected_delivery_date']
    search_fields  = ['po_number', 'supplier_name', 'supplier_reference']
    readonly_fields = ['created_at', 'updated_at', 'total_value', 'is_overdue']
    inlines        = [PurchaseOrderItemInline]
    fieldsets      = [
        ('Order', {'fields': ['po_number', 'status', 'notes']}),
        ('Supplier', {'fields': ['supplier_name', 'supplier_reference', 'supplier_contact', 'supplier_email', 'supplier_phone']}),
        ('Schedule', {'fields': ['expected_delivery_date', 'received_at']}),
        ('Audit', {'fields': ['created_by', 'updated_by', 'created_at', 'updated_at', 'total_value']}),
    ]

    @admin.display(description='Overdue', boolean=True)
    def priority_marker(self, obj):
        return obj.is_overdue


# ---------------------------------------------------------------------------
# Work Orders
# ---------------------------------------------------------------------------

class WorkOrderItemInline(admin.TabularInline):
    model  = WorkOrderItem
    extra  = 0
    fields = [
        'product', 'source_location',
        'quantity_required', 'quantity_issued', 'notes',
    ]


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display  = [
        'wo_number', 'title', 'status', 'priority',
        'assigned_to', 'due_date', 'is_overdue', 'created_by', 'created_at',
    ]
    list_filter   = ['status', 'priority', 'created_at', 'due_date']
    search_fields = ['wo_number', 'title', 'description']
    readonly_fields = ['created_at', 'updated_at', 'is_overdue', 'is_terminal', 'completed_at']
    inlines       = [WorkOrderItemInline]
    fieldsets     = [
        ('Work Order', {'fields': ['wo_number', 'title', 'description', 'status', 'priority']}),
        ('Assignment', {'fields': ['assigned_to', 'due_date', 'completed_at']}),
        ('Notes', {'fields': ['notes']}),
        ('Audit', {'fields': ['created_by', 'updated_by', 'created_at', 'updated_at']}),
    ]

    @admin.display(description='Overdue', boolean=True)
    def is_overdue(self, obj):
        return obj.is_overdue
