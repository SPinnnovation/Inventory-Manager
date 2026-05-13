--------------------
trigger: inventory_models_generation
--------------------

# Inventory App - Production Models Architecture

This document defines the strict schema, fields, and constraints to be used when generating the `backend/apps/inventory/models.py` file. All models must subclass a shared `TimeStampedModel` (or explicitly define `created_at` and `updated_at`) to ensure production-level auditing.

## 1. Abstract Base Models
*   **TimeStampedModel** (Abstract):
    *   `created_at` (DateTimeField, auto_now_add=True)
    *   `updated_at` (DateTimeField, auto_now=True)

## 2. Physical Hierarchy Models
All hierarchy models cascade down from Warehouse to Shelf. If a parent is deactivated, the UI/services should handle cascading logic, but database relationships use `CASCADE` for structural integrity.

*   **Warehouse**:
    *   `name` (CharField, max_length=100)
    *   `code` (CharField, max_length=20, unique=True, db_index=True) - For quick API lookups.
    *   `address` (TextField, blank=True)
    *   `is_active` (BooleanField, default=True)

*   **Floor**:
    *   `warehouse` (ForeignKey to Warehouse, on_delete=CASCADE, related_name='floors')
    *   `level` (CharField, max_length=50)
    *   `is_active` (BooleanField, default=True)
    *   *Constraint*: Unique constraint on `['warehouse', 'level']`.

*   **Rack**:
    *   `floor` (ForeignKey to Floor, on_delete=CASCADE, related_name='racks')
    *   `identifier` (CharField, max_length=50)
    *   `is_active` (BooleanField, default=True)
    *   *Constraint*: Unique constraint on `['floor', 'identifier']`.

*   **Shelf (Location)**:
    *   `rack` (ForeignKey to Rack, on_delete=CASCADE, related_name='shelves')
    *   `identifier` (CharField, max_length=50)
    *   `barcode_or_rfid` (CharField, max_length=100, unique=True, null=True, blank=True) - For scanner integration.
    *   `max_weight_capacity` (DecimalField, max_digits=10, decimal_places=2, null=True, blank=True) - Production constraint.
    *   `is_active` (BooleanField, default=True)
    *   *Constraint*: Unique constraint on `['rack', 'identifier']`.

## 3. Catalog Model
*   **Product**:
    *   `name` (CharField, max_length=255)
    *   `sku` (CharField, max_length=100, unique=True, db_index=True)
    *   `description` (TextField, blank=True)
    *   `image` (ImageField, upload_to='products/', null=True, blank=True)
    *   `unit_of_measure` (CharField, max_length=20, default='pcs') - E.g., 'pcs', 'kg', 'liters'.
    *   `base_price` (DecimalField, max_digits=12, decimal_places=2, default=0.00)
    *   `predictive_price` (DecimalField, max_digits=12, decimal_places=2, null=True, blank=True)
    *   `market_price` (DecimalField, max_digits=12, decimal_places=2, default=0.00)
    *   `reorder_point` (DecimalField, max_digits=10, decimal_places=2, default=0) - Triggers low-stock alerts.
    *   `is_active` (BooleanField, default=True)

## 4. Stock & Persistence Models (The Pivot)
This represents the physical instantiation of a Product at a Location.

*   **Stock**:
    *   `product` (ForeignKey to Product, on_delete=PROTECT, related_name='stocks') - Cannot delete a product if it has physical stock.
    *   `location` (ForeignKey to Shelf, on_delete=PROTECT, related_name='stocks') - Cannot delete a shelf if it holds stock.
    *   `quantity` (DecimalField, max_digits=14, decimal_places=4, default=0.0000) - Decimal supports fractions (e.g., 1.5 kg).
    *   `version` (IntegerField, default=1) - **MANDATORY**: For optimistic locking during concurrent transactions.
    *   `last_counted_at` (DateTimeField, null=True, blank=True) - For physical audit cycles.
    *   *Constraints*: 
        *   `UniqueConstraint` on `['product', 'location']`.
        *   `CheckConstraint` for `quantity >= 0` to absolutely prevent negative inventory.

## 5. Audit Model
Every movement must be logged. This model must be append-only.

*   **StockMovement**:
    *   `MovementType` (TextChoices): 
        *   `PO_RECEIPT` (Purchase Order Inbound)
        *   `WO_ISSUE` (Work Order Outbound)
        *   `ADJUSTMENT_ADD` (Manual Count Adjustment +)
        *   `ADJUSTMENT_SUB` (Manual Count Adjustment -)
        *   `RETURN` (Returned to stock)
    *   `stock` (ForeignKey to Stock, on_delete=PROTECT, related_name='movements')
    *   `quantity_changed` (DecimalField, max_digits=14, decimal_places=4) - Positive or negative value.
    *   `movement_type` (CharField, choices=MovementType.choices)
    *   `reference_id` (CharField, max_length=100, blank=True) - E.g., PO-1029, WO-4021.
    *   `user` (ForeignKey to settings.AUTH_USER_MODEL, on_delete=PROTECT)
    *   `reason` (TextField, blank=True)
    *   `timestamp` (DateTimeField, auto_now_add=True, db_index=True)
    *   *Security Rule*: Override `save()` and `delete()` methods. Once an instance is saved, it cannot be updated or deleted.

## 6. Implementation Guardrails
1.  Ensure `__str__` methods are defined cleanly for Django Admin readability.
2.  Use `django.core.validators.MinValueValidator(0)` on quantity fields as a Python-level safeguard alongside the DB `CheckConstraint`.
3.  Imports must include `from django.db import models` and `from django.conf import settings`.