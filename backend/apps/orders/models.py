from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

# -------------------------------------------------------------
#  Abstract Base Models - Timestamps
# -------------------------------------------------------------

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# -------------------------------------------------------------
# Purchase Orders (Inbound - stock arriving from suppliers)
# -------------------------------------------------------------

class PurchaseOrder(TimeStampedModel):
    """Represents an inbound order from a supplier into the warehouse."""
    
    class OrderStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ISSUED = 'ISSUED', 'Issued'
        PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED', 'Partially Received'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        
    # Core identity
    po_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique identifier for the purchase order (e.g., 'PO-2024-0001') - Auto generated if left blank",
        db_index=True,
        blank=True,        
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
        help_text="Current status of the purchase order",
        db_index=True,
    )
    
    # Supplier Information
    supplier_name = models.CharField(max_length=255)
    supplier_reference = models.CharField(max_length=255, blank=True, null=True)
    supplier_contact = models.CharField(max_length=255, blank=True, null=True)
    supplier_email = models.EmailField(blank=True, null=True)
    supplier_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Scheduling
    expected_delivery_date = models.DateField(blank=True, null=True)
    received_at = models.DateTimeField(blank=True, null=True) # Set automatically when status changes
    
    # Internal 
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,        
        related_name='created_pos',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,        
        related_name='updated_pos',
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Purchase Order'
        verbose_name_plural = 'Purchase Orders'
        
    def __str__(self):
        return f"{self.po_number} | {self.supplier_name} | ({self.status})"
    
    # -------------------------
    # Helpers
    # -------------------------
    
    @property
    def total_value(self) -> Decimal:
        """Sum of all line totals (quantity_ordered × unit_price)."""
        return sum((item.line_total for item in self.items.all()), Decimal('0.00')) 

    @property
    def is_overdue(self) -> bool:
        """True when expected delivery has passed and order is not closed."""
        closed = {self.OrderStatus.COMPLETED, self.OrderStatus.CANCELLED}
        
        return (
            bool(self.expected_delivery_date)
            and self.status not in closed
            and timezone.now().date() > self.expected_delivery_date
        )        
        
        
class PurchaseOrderItem(TimeStampedModel):
    """A single product line within a Purchase Order."""
    
    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        related_name='po_items',
    )
    destination_location = models.ForeignKey(
        'inventory.Shelf',
        on_delete=models.PROTECT,
        related_name='expected_po_items',
        blank=True,
        null=True,
    ) # The shelf where the product is expected to be stored upon receipt; optional but can help with receiving workflow
    quantity_ordered = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    quantity_received = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Purchase Order Item'
        verbose_name_plural = 'Purchase Order Items'
        ordering = ['order', 'product__name']
        constraints         = [
            models.CheckConstraint(
                check=models.Q(quantity_ordered__gt=0),
                name='po_item_quantity_ordered_positive',
            ),
            models.CheckConstraint(
                check=models.Q(quantity_received__gte=0),
                name='po_item_quantity_received_non_negative',
            ),
        ]
        
    def __str__(self):
        return f"{self.order.po_number} – {self.product.sku}"

    @property
    def line_total(self) -> Decimal:
        """
        Calculate the total value of this line item (quantity_ordered × unit_price).
        """
        return Decimal(str(self.quantity_ordered)) * self.unit_price

    @property
    def quantity_outstanding(self) -> int:
        """
        Calculate the quantity of this line item that has not yet been received.
        """
        return max(0, self.quantity_ordered - self.quantity_received)

    @property
    def is_fully_received(self) -> bool:
        """
        Check if the line item has been fully received.
        """
        return self.quantity_received >= self.quantity_ordered
    
    
    
# -------------------------------------------------------------
#  Work Orders (Outbound - stock consumed for a task or project)
# -------------------------------------------------------------

class WorkOrder(TimeStampedModel):
    """Represents an outbound consumption order pulling stock from shelf locations."""
    
    class WorkOrderStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ISSUED = 'ISSUED', 'Issued'        
        CANCELLED = 'CANCELLED', 'Cancelled'
        PENDING_INSUFFICIENT_STOCK = 'PENDING_INSUFFICIENT_STOCK', 'Pending - Insufficient Stock'
        COMPLETED_FULLY_USED = 'COMPLETED_FULLY_USED', 'Completed - Fully Used'
        COMPLETED_PARTIALLY_USED = 'COMPLETED_PARTIALLY_USED', 'Completed - Partially Used'
        COMPLETED_NOT_USED = 'COMPLETED_NOT_USED', 'Completed - Not Used'
        
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'
        
    # Core identity
    wo_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique identifier for the work order (e.g., 'WO-2024-0001') - Auto generated if left blank",
        db_index=True,
        blank=True,        
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=50,
        choices=WorkOrderStatus.choices,
        default=WorkOrderStatus.DRAFT,
        help_text="Current status of the work order",
        db_index=True,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        help_text="Priority level of the work order",
        db_index=True,
    )
    
    # Assignment
    # assigned_to = models.ForeignKey(
    #     settings.AUTH_USER_MODEL,
    #     on_delete=models.PROTECT,
    #     related_name='assigned_work_orders',
    #     blank=True,
    #     null=True,
    # )   For future use when we want to assign work orders to specific users
    assigned_to = models.CharField(max_length=255, blank=True, null=True) # Placeholder for future user assignment; currently just a free-text field
    
    # Scheduling
    due_date = models.DateField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True) # Set automatically when status
    
    # Internal
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,        
        related_name='created_work_orders',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,        
        related_name='updated_work_orders',
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Work Order'
        verbose_name_plural = 'Work Orders'
        
    def __str__(self):
        return f"{self.wo_number} | {self.title} | {self.get_status_display()}"

    # ------------------------------------------------------------------
    # Computed helpers
    # ------------------------------------------------------------------

    @property
    def is_overdue(self) -> bool:
        """True when due date has passed and the WO is not in a terminal state."""
        terminal = {
            self.WorkOrderStatus.COMPLETED_FULLY_USED,
            self.WorkOrderStatus.COMPLETED_PARTIALLY_USED,
            self.WorkOrderStatus.COMPLETED_NOT_USED,
            self.WorkOrderStatus.CANCELLED,
        }
        return (
            bool(self.due_date)
            and self.status not in terminal
            and timezone.now().date() > self.due_date
        )

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            self.WorkOrderStatus.COMPLETED_FULLY_USED,
            self.WorkOrderStatus.COMPLETED_PARTIALLY_USED,
            self.WorkOrderStatus.COMPLETED_NOT_USED,
            self.WorkOrderStatus.CANCELLED,
        }
        

class WorkOrderItem(TimeStampedModel):
    """A single product line within a Work Order."""
    
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.PROTECT,
        related_name='wo_items',
    )
    source_location = models.ForeignKey(
        'inventory.Shelf', on_delete=models.PROTECT, related_name='expected_wo_items',
        help_text="The shelf from which stock will be pulled.",
    )
    quantity_required = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    quantity_issued = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name        = 'Work Order Item'
        verbose_name_plural = 'Work Order Items'
        ordering            = ['work_order', 'product__name']
        constraints         = [
            models.CheckConstraint(
                check=models.Q(quantity_required__gt=0),
                name='wo_item_quantity_required_positive',
            ),
            models.CheckConstraint(
                check=models.Q(quantity_issued__gte=0),
                name='wo_item_quantity_issued_non_negative',
            ),
        ]

    def __str__(self):
        return f"{self.work_order.wo_number} – {self.product.sku}"

    @property
    def quantity_outstanding(self) -> int:
        """
        The quantity of the item that has not yet been issued.
        """
        return max(0, self.quantity_required - self.quantity_issued)

    @property
    def is_fully_issued(self) -> bool:
        """
        True when the quantity issued is greater than or equal to the quantity required.
        """
        return self.quantity_issued >= self.quantity_required