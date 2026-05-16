from rest_framework import serializers


class LowStockSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    unit_of_measure = serializers.CharField(allow_null=True)
    reorder_point = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    total_qty = serializers.IntegerField()


class BlockedWOSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    wo_number = serializers.CharField()
    title = serializers.CharField()
    priority = serializers.CharField()
    created_at = serializers.DateTimeField()


class OverduePOSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    po_number = serializers.CharField()
    supplier_name = serializers.CharField()
    expected_delivery_date = serializers.DateField(allow_null=True)
    days_overdue = serializers.IntegerField()


class RecentMovementSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    product_sku = serializers.CharField()
    location = serializers.CharField()
    quantity_changed = serializers.IntegerField()
    movement_type = serializers.CharField()
    reference_id = serializers.CharField(allow_null=True, allow_blank=True)
    user_email = serializers.CharField()
    timestamp = serializers.DateTimeField()


class BurnRateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    daily_burn_rate = serializers.FloatField()
    total_stock = serializers.IntegerField()
    estimated_days_remaining = serializers.IntegerField(allow_null=True)
