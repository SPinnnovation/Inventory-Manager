from django.contrib import admin

from .models import Category, Floor, Product, Rack, Shelf, Stock, StockMovement, Warehouse


# ---------------------------------------------------------------------------
# Physical Hierarchy (inline nesting for usability)
# ---------------------------------------------------------------------------

class FloorInline(admin.TabularInline):
    model = Floor
    extra = 0
    fields = ['level', 'is_active']


class RackInline(admin.TabularInline):
    model = Rack
    extra = 0
    fields = ['identifier', 'is_active']


class ShelfInline(admin.TabularInline):
    model = Shelf
    extra = 0
    fields = ['identifier', 'barcode_or_rfid', 'max_weight_capacity', 'is_active']


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code', 'name']
    inlines = [FloorInline]


@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'warehouse', 'level', 'is_active']
    list_filter = ['is_active', 'warehouse']
    search_fields = ['level', 'warehouse__code', 'warehouse__name']
    inlines = [RackInline]


@admin.register(Rack)
class RackAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'floor', 'identifier', 'is_active']
    list_filter = ['is_active', 'floor__warehouse']
    search_fields = ['identifier']
    inlines = [ShelfInline]


@admin.register(Shelf)
class ShelfAdmin(admin.ModelAdmin):
    list_display = ['full_path', 'identifier', 'barcode_or_rfid', 'max_weight_capacity', 'is_active']
    list_filter = ['is_active', 'rack__floor__warehouse']
    search_fields = ['identifier', 'barcode_or_rfid']


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'unit_of_measure', 'base_price', 'reorder_point', 'is_active']
    list_filter = ['is_active', 'unit_of_measure', 'category']
    search_fields = ['sku', 'name']
    readonly_fields = ['created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------

class StockMovementInline(admin.TabularInline):
    model = StockMovement
    extra = 0
    readonly_fields = [
        'quantity_changed', 'movement_type', 'reference_id', 'user', 'reason', 'timestamp',
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'product', 'location', 'quantity', 'version', 'last_counted_at']
    list_filter = ['location__rack__floor__warehouse']
    search_fields = ['product__sku', 'product__name', 'location__identifier']
    readonly_fields = ['version', 'created_at', 'updated_at']
    inlines = [StockMovementInline]


# ---------------------------------------------------------------------------
# Stock Movement — append-only; no add, change, or delete in admin
# ---------------------------------------------------------------------------

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'movement_type', 'stock', 'quantity_changed', 'reference_id', 'user',
    ]
    list_filter = ['movement_type']
    search_fields = ['reference_id', 'stock__product__sku', 'user__email']
    readonly_fields = [
        'stock', 'quantity_changed', 'movement_type',
        'reference_id', 'reason', 'user', 'timestamp',
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
