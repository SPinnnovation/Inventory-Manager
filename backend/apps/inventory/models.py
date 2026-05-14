from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        
        
# ------------------------------------------------------------------------------
# PHYSICAL HIERARCHY
# ------------------------------------------------------------------------------

class Warehouse(TimeStampedModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:        
        verbose_name = "Warehouse"
        verbose_name_plural = "Warehouses"
        ordering = ['code']
        
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    
class Floor(TimeStampedModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="floors")
    level = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Floor"
        verbose_name_plural = "Floors"
        ordering = ['warehouse', 'level']
        constraints = [
            models.UniqueConstraint(fields=['warehouse', 'level'], name='unique_floor_per_warehouse')
        ]
        
    def __str__(self):
        return f"{self.warehouse.code} / Floor {self.level}"
    
    
    
class Rack(TimeStampedModel):
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="racks")
    identifier = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Rack"
        verbose_name_plural = "Racks"
        ordering = ['floor', 'identifier']
        constraints = [
            models.UniqueConstraint(fields=['floor', 'identifier'], name='unique_rack_per_floor')
        ]
        
    def __str__(self):
        return f"{self.floor} / Rack {self.identifier}"
    
    

class Shelf(TimeStampedModel):
    rack = models.ForeignKey(Rack, on_delete=models.CASCADE, related_name="shelves")
    identifier = models.CharField(max_length=50)
    barcode_or_rfid = models.CharField(max_length=100, blank=True, null=True, unique=True)
    max_weight_capacity = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))],
        blank=True, null=True,
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Shelf"
        verbose_name_plural = "Shelves"
        ordering = ['rack', 'identifier']
        constraints = [
            models.UniqueConstraint(fields=['rack', 'identifier'], name='unique_shelf_per_rack')
        ]
        
    def __str__(self):
        return f"{self.rack} / Shelf {self.identifier}"
    
    @property
    def full_path(self):
        """
        Human readable full location path
        """
        w = self.rack.floor.warehouse
        return f'{w.code} › F{self.rack.floor.level} › R{self.rack.identifier} › S{self.identifier}'
    
    
# ------------------------------------------------------------------------------
# CATALOG
# ------------------------------------------------------------------------------

class Category(TimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ['name']
        
    def __str__(self):
        return self.name
    
    
class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True, related_name="products")
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    unit_of_measure = models.CharField(max_length=50, blank=True, null=True, default="pcs")
    base_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))],
        blank=True, null=True,
    )
    predictive_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))],
        blank=True, null=True,
    )
    market_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))],
        blank=True, null=True,
    )
    reorder_point = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))],
        blank=True, null=True,
        help_text="The stock level at which a reorder should be triggered."
    )
    is_active = models.BooleanField(default=True)
    meta = models.JSONField(blank=True, null=True) # Stores tracking of product prices over time, e.g. [{"date": "2024-01-01", "price": 9.99}, {"date": "2024-02-01", "price": 8.99}]
    
    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['name']
        
    def __str__(self):
        return f'{self.name} - ({self.sku})'
    
    
# ------------------------------------------------------------------------------
# STOCK (pivot: product x location)
# ------------------------------------------------------------------------------

class Stock(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="stocks")
    location= models.ForeignKey(Shelf, on_delete=models.PROTECT, related_name="stocks")
    quantity = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    version = models.IntegerField(default=1) # For optimistic locking
    last_counted_at = models.DateTimeField(blank=True, null=True) # Timestamp of last physical count for this stock record
    
    class Meta:
        verbose_name = 'Stock'
        verbose_name_plural = 'Stock'
        ordering = ['product__name']
        constraints = [
            models.UniqueConstraint(fields=['product', 'location'], name='unique_stock_per_location'),
            models.CheckConstraint(check=models.Q(quantity__gte=0), name='stock_quantity_non_negative'),
        ]
        
    def __str__(self):
        return f'{self.product.sku} @ {self.location} = {self.quantity} {self.product.unit_of_measure}'
    
    
# ------------------------------------------------------------------------------
# AUDIT LOGS - append only records for traceability
# ------------------------------------------------------------------------------

class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        PO_RECEIPT = 'PO_RECEIPT', 'Purchase Order Inbound'
        WO_ISSUE = 'WO_ISSUE', 'Work Order Outbound'
        ADJUSTMENT_ADD = 'ADJUSTMENT_ADD', 'Manual Adjustment +'
        ADJUSTMENT_SUB = 'ADJUSTMENT_SUB', 'Manual Adjustment −'
        RETURN = 'RETURN', 'Returned to Stock'
        
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT, related_name="movements")
    quantity_changed = models.IntegerField() # Positive for additions, negative for subtractions
    movement_type = models.CharField(max_length=20, choices=MovementType.choices, db_index=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True) # E.g. PO number, WO number, or adjustment reason code
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="stock_movements") # User responsible for the movement (if applicable)
    reason = models.TextField(blank=True, null=True) # Optional free-text reason for the movement (especially for adjustments)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ['-timestamp']
        
    def __str__(self):
        return (
            f'{self.movement_type} | {self.stock.product.sku} | '
            f'{self.quantity_changed:+} | {self.timestamp:%Y-%m-%d %H:%M}'
        )
        
    # ------------------------------------------------------------------
    # Append-only enforcement — records may never be mutated or deleted
    # ------------------------------------------------------------------

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise PermissionError(
                'StockMovement records are append-only and cannot be modified after creation.'
            )
        super().save(*args, **kwargs)   # Allow creation of new records, but prevent updates to existing ones

    def delete(self, *args, **kwargs):
        raise PermissionError('StockMovement records are append-only and cannot be deleted.')