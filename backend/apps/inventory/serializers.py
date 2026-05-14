from rest_framework import serializers

from .models import Category, Floor, Product, Rack, Shelf, Stock, StockMovement, Warehouse


# ---------------------------------------------------------------------------
# Minimal / nested read serializers
# ---------------------------------------------------------------------------

class WarehouseMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'code']


class ShelfLocationSerializer(serializers.ModelSerializer):
    """Full path descriptor used inside Stock responses."""
    rack_identifier  = serializers.CharField(source='rack.identifier', read_only=True)
    floor_level      = serializers.CharField(source='rack.floor.level', read_only=True)
    warehouse_name   = serializers.CharField(source='rack.floor.warehouse.name', read_only=True)
    warehouse_code   = serializers.CharField(source='rack.floor.warehouse.code', read_only=True)

    class Meta:
        model = Shelf
        fields = [
            'id', 'identifier', 'barcode_or_rfid',
            'rack_identifier', 'floor_level', 'warehouse_name', 'warehouse_code',
        ]


class ProductMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'unit_of_measure', 'reorder_point']


class CategoryMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


# ---------------------------------------------------------------------------
# Physical Hierarchy
# ---------------------------------------------------------------------------

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'code', 'address', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class FloorSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)

    class Meta:
        model = Floor
        fields = [
            'id', 'warehouse', 'warehouse_name', 'warehouse_code',
            'level', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'warehouse_name', 'warehouse_code']


class RackSerializer(serializers.ModelSerializer):
    floor_level      = serializers.CharField(source='floor.level', read_only=True)
    warehouse_code   = serializers.CharField(source='floor.warehouse.code', read_only=True)

    class Meta:
        model = Rack
        fields = [
            'id', 'floor', 'floor_level', 'warehouse_code',
            'identifier', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'floor_level', 'warehouse_code']


class ShelfSerializer(serializers.ModelSerializer):
    rack_identifier = serializers.CharField(source='rack.identifier', read_only=True)
    floor_level     = serializers.CharField(source='rack.floor.level', read_only=True)
    warehouse_code  = serializers.CharField(source='rack.floor.warehouse.code', read_only=True)
    full_path       = serializers.CharField(read_only=True)

    class Meta:
        model = Shelf
        fields = [
            'id', 'rack', 'rack_identifier', 'floor_level', 'warehouse_code',
            'identifier', 'barcode_or_rfid', 'max_weight_capacity',
            'is_active', 'full_path', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at',
            'rack_identifier', 'floor_level', 'warehouse_code', 'full_path',
        ]


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class ProductSerializer(serializers.ModelSerializer):
    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True,
        required=False, allow_null=True,
    )
    total_quantity = serializers.DecimalField(
        max_digits=14, decimal_places=4, read_only=True, default=None,
        help_text='Annotated by the viewset queryset; null when not annotated.',
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'image',
            'category', 'category_id',
            'unit_of_measure', 'base_price', 'predictive_price', 'market_price',
            'reorder_point', 'is_active', 'meta', 'total_quantity',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'total_quantity']


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------

class StockSerializer(serializers.ModelSerializer):
    product  = ProductMinimalSerializer(read_only=True)
    location = ShelfLocationSerializer(read_only=True)

    # Write fields
    product_id  = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True,
    )
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Shelf.objects.all(), source='location', write_only=True,
    )

    class Meta:
        model = Stock
        fields = [
            'id', 'product', 'product_id', 'location', 'location_id',
            'quantity', 'version', 'last_counted_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['quantity', 'version', 'created_at', 'updated_at']


class StockAdjustSerializer(serializers.Serializer):
    """Input for the /stock/{pk}/adjust/ action."""
    delta = serializers.IntegerField(
        help_text='Positive to add stock, negative to remove.',
    )
    movement_type = serializers.ChoiceField(choices=StockMovement.MovementType.choices)
    reference_id  = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    reason        = serializers.CharField(required=False, default='', allow_blank=True)
    version       = serializers.IntegerField(
        required=False,
        help_text='Current stock version for optimistic concurrency control.',
    )

    def validate_delta(self, value):
        if value == 0:
            raise serializers.ValidationError('Delta cannot be zero.')
        return value


# ---------------------------------------------------------------------------
# Stock Movement (read-only audit log)
# ---------------------------------------------------------------------------

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='stock.product.name', read_only=True)
    product_sku  = serializers.CharField(source='stock.product.sku', read_only=True)
    location     = serializers.CharField(source='stock.location.full_path', read_only=True)
    user_email   = serializers.CharField(source='user.email', read_only=True)
    movement_type_display = serializers.CharField(
        source='get_movement_type_display', read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'product_name', 'product_sku', 'location',
            'quantity_changed', 'movement_type', 'movement_type_display',
            'reference_id', 'reason', 'user', 'user_email', 'timestamp',
        ]
        read_only_fields = fields  # entire resource is immutable via API
