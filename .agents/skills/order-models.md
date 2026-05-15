--------------------
trigger: order_models_generation
--------------------

# Orders App - Production Models Architecture

This document defines the strict schema, fields, and constraints to be used when generating the `backend/apps/orders/models.py` file. All models must subclass a shared `TimeStampedModel` (or explicitly define `created_at` and `updated_at`) to ensure production-level auditing.

## 1. Abstract Base Models
*   **TimeStampedModel** (Abstract):
    *   `created_at` (DateTimeField, auto_now_add=True)
    *   `updated_at` (DateTimeField, auto_now=True)

## 2. Inbound Orders: Purchase Orders (PO)
Purchase Orders represent incoming stock from suppliers that will be received into the warehouse hierarchy.

*   **PurchaseOrder**:
    *   `OrderStatus` (TextChoices): 
        *   `DRAFT` (Draft)
        *   `ISSUED` (Issued)
        *   `PARTIALLY_RECEIVED` (Partially Received)
        *   `COMPLETED` (Completed)
        *   `CANCELLED` (Cancelled)
    *   `po_number` (CharField, max_length=50, unique=True, db_index=True)
    *   `supplier_name` (CharField, max_length=255)
    *   `status` (CharField, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    *   `created_by` (ForeignKey to settings.AUTH_USER_MODEL, on_delete=PROTECT, related_name='created_pos')

*   **PurchaseOrderItem**:
    *   `order` (ForeignKey to PurchaseOrder, on_delete=CASCADE, related_name='items')
    *   `product` (ForeignKey to 'inventory.Product', on_delete=PROTECT, related_name='po_items')
    *   `destination_location` (ForeignKey to 'inventory.Shelf', on_delete=PROTECT, related_name='expected_po_items')
    *   `quantity_ordered` (IntegerField)
    *   `quantity_received` (IntegerField, default=0)
    *   `unit_price` (DecimalField, max_digits=12, decimal_places=2)
    *   *Constraints*: 
        *   `CheckConstraint` for `quantity_ordered > 0`.
        *   `CheckConstraint` for `quantity_received >= 0`.

## 3. Outbound Orders: Work Orders (WO)
Work Orders represent outbound consumption of stock (manufacturing, dispatch, or internal usage) from specific shelf locations.

*   **WorkOrder**:
    *   `WorkOrderStatus` (TextChoices):
        *   `DRAFT` (Draft)
        *   `ISSUED` (Issued - Stock reserved/checked)
        *   `PENDING_INSUFFICIENT_STOCK` (Pending - Insufficient Stock)
        *   `COMPLETED_FULLY_USED` (Completed - Products Fully Used)
        *   `COMPLETED_PARTIALLY_USED` (Completed - Products Partially Used)
        *   `COMPLETED_NOT_USED` (Completed - Products Not Used)
        *   `CANCELLED` (Cancelled)
    *   `wo_number` (CharField, max_length=50, unique=True, db_index=True)
    *   `title` (CharField, max_length=255)
    *   `status` (CharField, choices=WorkOrderStatus.choices, default=WorkOrderStatus.DRAFT)
    *   `assigned_to` (CharField, max_length=255, blank=True, null=True) - Optional field to track who is responsible for the WO. 
    *   `created_by` (ForeignKey to settings.AUTH_USER_MODEL, on_delete=PROTECT, related_name='created_wos')

*   **WorkOrderItem**:
    *   `work_order` (ForeignKey to WorkOrder, on_delete=CASCADE, related_name='items')
    *   `product` (ForeignKey to 'inventory.Product', on_delete=PROTECT, related_name='wo_items')
    *   `source_location` (ForeignKey to 'inventory.Shelf', on_delete=PROTECT, related_name='expected_wo_items')
    *   `quantity_required` (IntegerField)
    *   `quantity_issued` (IntegerField, default=0) - The actual amount that was pulled from the shelf.
    *   *Constraints*:
        *   `CheckConstraint` for `quantity_required > 0`.
        *   `CheckConstraint` for `quantity_issued >= 0`.

## 4. Implementation Guardrails
1.  **Cross-App Foreign Keys**: When referencing inventory models, use the string format (e.g., `'inventory.Product'`) to prevent circular import errors.
2.  **Protective Deletion**: Use `on_delete=models.PROTECT` for all `Product`, `Shelf`, and `User` foreign keys. An order item should never cascade delete an inventory product or a location.
3.  **Data Validation**: Use `django.core.validators.MinValueValidator(0)` on quantity fields as a Python-level safeguard alongside the DB `CheckConstraint`.
4.  **String Representations**: Define cleanly formatted `__str__` methods for all models to aid in Django Admin readability (e.g., `return f"{self.order.po_number} - {self.product.sku}"`).
5.  **Required Imports**: 
    *   `from django.db import models`
    *   `from django.conf import settings`
    *   `from django.core.validators import MinValueValidator`