from rest_framework import serializers

from apps.inventory.models import Product, Shelf
from apps.accounts.models import User
from .models import PurchaseOrder, PurchaseOrderItem, WorkOrder, WorkOrderItem

# ---------------------------------------------------------------------------
# Minimal cross-app serializers
# ---------------------------------------------------------------------------

class _ProductMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'unit_of_measure']
        
        
class _ShelfMinimalSerializer(serializers.ModelSerializer):
    full_path = serializers.CharField(read_only=True)
    
    class Meta:
        model = Shelf
        fields = ['id', 'identifier', 'full_path']
        
        
class _UserMinimalSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']
    
    

# ---------------------------------------------------------------------------
# Purchase Order Itams  
# ---------------------------------------------------------------------------

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    # Nested read
    product = _ProductMinimalSerializer(read_only=True)
    destination_location = _ShelfMinimalSerializer(read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    quantity_outstanding = serializers.IntegerField(read_only=True)
    is_fully_received = serializers.BooleanField(read_only=True)
    
    # PK write
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source='product',
        write_only=True,
    )   # Only active products can be added to new PO items; existing items with inactive products can still be updated.
    destination_location_id = serializers.PrimaryKeyRelatedField(
        queryset=Shelf.objects.filter(is_active=True),
        source='destination_location',
        write_only=True,
        required=False,
        allow_null=True,
    )   # Location is optional for PO items; if not provided, it can be assigned later when receiving items.
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'order',
            'product', 'product_id',
            'destination_location', 'destination_location_id',
            'quantity_ordered', 'quantity_received', 'unit_price',
            'line_total', 'quantity_outstanding', 'is_fully_received',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['quantity_received', 'created_at', 'updated_at']

    def validate(self, data):
        order = data.get('order') or (self.instance.order if self.instance else None)   # Get the associated order from either the incoming data (for create) or the existing instance (for update)
        
        if order and order.status not in (
            PurchaseOrder.OrderStatus.DRAFT,
            PurchaseOrder.OrderStatus.ISSUED,
        ):  # Only allow adding/updating items if the order is in DRAFT or ISSUED status
            raise serializers.ValidationError(
                f'Cannot modify items on a PO with status "{order.status}". '
                'Only DRAFT or ISSUED orders allow item changes.'
            )
        return data
    
    
# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

class PurchaseOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for PurchaseOrder model.
    """
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by = _UserMinimalSerializer(read_only=True)
    updated_by = _UserMinimalSerializer(read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'status', 'status_display',
            'supplier_name', 'supplier_reference', 'supplier_contact',
            'supplier_email', 'supplier_phone',
            'expected_delivery_date', 'received_at',
            'notes', 'total_value', 'is_overdue',
            'created_by', 'updated_by',
            'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'po_number', 'received_at',
            'created_by', 'updated_by',
            'created_at', 'updated_at',
        ]

    def validate_status(self, value):
        """
        Ensure that the status can only be changed through dedicated action endpoints.
        """
        if self.instance and value != self.instance.status:
            raise serializers.ValidationError(
                'Use the dedicated action endpoints (/issue/, /cancel/) to change status.'
            )
        return value
    
    
# ---------------------------------------------------------------------------
# Work Order Items
# ---------------------------------------------------------------------------

class WorkOrderItemSerializer(serializers.ModelSerializer):
    # Nested read
    product = _ProductMinimalSerializer(read_only=True)
    source_location = _ShelfMinimalSerializer(read_only=True)
    quantity_outstanding = serializers.IntegerField(read_only=True)
    is_fully_issued = serializers.BooleanField(read_only=True)

    # PK write
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        source='product',
        write_only=True,
    )   # Only active products can be added to new WO items; existing items with inactive products can still be updated.
    source_location_id = serializers.PrimaryKeyRelatedField(
        queryset=Shelf.objects.filter(is_active=True),
        source='source_location',
        write_only=True,
    )   # Source location is required for WO items, as they represent issuing from stock. Only active shelves can be assigned to new WO items; existing items with inactive shelves can still be updated.

    class Meta:
        model = WorkOrderItem
        fields = [
            'id', 'work_order',
            'product', 'product_id',
            'source_location', 'source_location_id',
            'quantity_required', 'quantity_issued',
            'quantity_outstanding', 'is_fully_issued',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['quantity_issued', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Validate that items can only be added/modified when the parent work order is in DRAFT status.
        """
        wo = data.get('work_order') or (self.instance.work_order if self.instance else None)    # Get the associated work order from either the incoming data (for create) or the existing instance (for update)
        
        if wo and wo.status != WorkOrder.WorkOrderStatus.DRAFT:
            raise serializers.ValidationError(
                f'Cannot modify items on a WO with status "{wo.status}". Only DRAFT allows changes.'
            )
        return data


# ---------------------------------------------------------------------------
# Work Orders
# ---------------------------------------------------------------------------

class WorkOrderSerializer(serializers.ModelSerializer):
    items = WorkOrderItemSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_terminal = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    created_by = _UserMinimalSerializer(read_only=True)
    updated_by = _UserMinimalSerializer(read_only=True)

    class Meta:
        model = WorkOrder
        fields = [
            'id', 'wo_number', 'title', 'description',
            'status', 'status_display', 'priority', 'priority_display',
            'assigned_to', 'due_date', 'completed_at',
            'notes', 'is_overdue', 'is_terminal',
            'created_by', 'updated_by',
            'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'wo_number', 'completed_at',
            'created_by', 'updated_by',
            'created_at', 'updated_at',
        ]

    def validate_status(self, value):
        """
        Validate that the status can only be changed through dedicated action endpoints.
        """
        if self.instance and value != self.instance.status:
            raise serializers.ValidationError(
                'Use the dedicated action endpoints (/issue/, /complete/, /cancel/) to change status.'
            )
        return value


# ---------------------------------------------------------------------------
# Action input serializers
# ---------------------------------------------------------------------------

class ReceivePOItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, help_text='Units being received in this delivery.')
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class CompleteWorkOrderSerializer(serializers.Serializer):
    COMPLETION_CHOICES = [
        (WorkOrder.WorkOrderStatus.COMPLETED_FULLY_USED, 'Completed — Fully Used'),
        (WorkOrder.WorkOrderStatus.COMPLETED_PARTIALLY_USED, 'Completed — Partially Used'),
        (WorkOrder.WorkOrderStatus.COMPLETED_NOT_USED, 'Completed — Not Used'),
    ]
    completion_status = serializers.ChoiceField(choices=COMPLETION_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True, default='')