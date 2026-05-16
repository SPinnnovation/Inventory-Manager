"""
Management command: seed_orders

Populates the orders app with realistic test data covering every status
variant for both Purchase Orders (inbound) and Work Orders (outbound).

Status coverage
---------------
  PurchaseOrder : DRAFT | ISSUED | PARTIALLY_RECEIVED | COMPLETED | CANCELLED
  WorkOrder     : DRAFT | ISSUED | PENDING_INSUFFICIENT_STOCK
                  COMPLETED_FULLY_USED | COMPLETED_PARTIALLY_USED | CANCELLED

Prerequisites
-------------
  Run `python manage.py seed_data` first — this command references
  Products, Shelves, and Users created by that command.

Usage
-----
    python manage.py seed_orders          # seed if no orders exist
    python manage.py seed_orders --reset  # wipe all orders and re-seed
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.inventory.models import Product, Shelf
from apps.orders import services
from apps.orders.models import (
    PurchaseOrder,
    PurchaseOrderItem,
    WorkOrder,
    WorkOrderItem,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _days_ago(n: int):
    return timezone.now() - timedelta(days=n)


def _date_ago(n: int):
    return timezone.now().date() - timedelta(days=n)


def _date_ahead(n: int):
    return timezone.now().date() + timedelta(days=n)


class Command(BaseCommand):
    help = (
        "Seed Purchase Orders and Work Orders test data. "
        "Requires seed_data to have been run first."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing orders then re-seed.",
        )

    # ------------------------------------------------------------------
    # Main entry
    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        if options["reset"]:
            self._reset()

        if PurchaseOrder.objects.exists() or WorkOrder.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Orders already exist — skipping. Use --reset to wipe and re-seed."
                )
            )
            return

        # Ensure prerequisites exist
        if not Product.objects.exists():
            self.stderr.write(
                self.style.ERROR(
                    "No products found. Run `python manage.py seed_data` first."
                )
            )
            return

        try:
            admin = User.objects.get(email="admin@example.com")
            manager = User.objects.get(email="john.manager@example.com")
        except User.DoesNotExist as exc:
            self.stderr.write(
                self.style.ERROR(
                    f"Seed user not found ({exc}). Run `python manage.py seed_data` first."
                )
            )
            return

        # Build lookup dictionaries
        products = {p.sku: p for p in Product.objects.all()}
        shelf_map = self._build_shelf_map()

        self.stdout.write("Seeding Purchase Orders …")
        self._seed_purchase_orders(products, shelf_map, admin, manager)

        self.stdout.write("Seeding Work Orders …")
        self._seed_work_orders(products, shelf_map, admin, manager)

        self.stdout.write(self.style.SUCCESS("Order seed completed successfully."))

    # ------------------------------------------------------------------
    # Reset
    # ------------------------------------------------------------------

    def _reset(self):
        wo_count, _ = WorkOrder.objects.all().delete()
        po_count, _ = PurchaseOrder.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(
                f"Reset complete — deleted {po_count} Purchase Order record(s) "
                f"and {wo_count} Work Order record(s).\n"
                "Note: Stock movements created by previous order seeds remain "
                "in the inventory. Run `seed_data --reset` for a full clean slate."
            )
        )

    # ------------------------------------------------------------------
    # Shelf lookup helper
    # ------------------------------------------------------------------

    def _build_shelf_map(self):
        """Return dict keyed by 'WH_CODE/FLOOR_LEVEL/RACK_ID/SHELF_ID'."""
        mapping = {}
        for shelf in Shelf.objects.select_related("rack__floor__warehouse"):
            key = (
                f"{shelf.rack.floor.warehouse.code}/"
                f"{shelf.rack.floor.level}/"
                f"{shelf.rack.identifier}/"
                f"{shelf.identifier}"
            )
            mapping[key] = shelf
        return mapping

    # ------------------------------------------------------------------
    # Purchase Orders
    # ------------------------------------------------------------------

    def _seed_purchase_orders(self, products, shelf_map, admin, manager):
        """
        Create 5 POs covering every status:
          1. DRAFT           – Plumbing Restock (open, not yet actioned)
          2. ISSUED          – PPE Quarterly Order (sent to supplier)
          3. PARTIALLY_RECEIVED – Hardware Batch (some goods arrived)
          4. COMPLETED       – Electrical Components (all goods received)
          5. CANCELLED       – Paint & Coating Order (order called off)
        """

        # --- 1. DRAFT PO: Plumbing Restock Q3 ---------------------------
        po_draft = PurchaseOrder.objects.create(
            supplier_name="Bharat Pipes & Fittings Pvt Ltd",
            supplier_reference="BPF-QUOTE-2026-089",
            supplier_contact="Rakesh Sharma",
            supplier_email="orders@bharatpipes.in",
            supplier_phone="+91-22-4400-5566",
            expected_delivery_date=_date_ahead(14),
            notes="Quarterly plumbing stock replenishment — three-item order.",
            status=PurchaseOrder.OrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        PurchaseOrderItem.objects.bulk_create([
            PurchaseOrderItem(
                order=po_draft,
                product=products["PLMB-001"],
                destination_location=shelf_map["WH-MAIN/G/C/S1"],
                quantity_ordered=40,
                unit_price="420.00",
            ),
            PurchaseOrderItem(
                order=po_draft,
                product=products["PLMB-002"],
                destination_location=shelf_map["WH-MAIN/G/C/S2"],
                quantity_ordered=60,
                unit_price="180.00",
            ),
            PurchaseOrderItem(
                order=po_draft,
                product=products["PLMB-004"],
                destination_location=shelf_map["WH-MAIN/G/C/S4"],
                quantity_ordered=80,
                unit_price="55.00",
            ),
        ])
        self.stdout.write(f"  Created DRAFT PO {po_draft.po_number}")

        # --- 2. ISSUED PO: PPE Quarterly Order ---------------------------
        po_issued = PurchaseOrder.objects.create(
            supplier_name="SafeGuard Equipment Co.",
            supplier_reference="SGE-PO-Q2-2026",
            supplier_contact="Priya Mehta",
            supplier_email="sales@safeguard.co.in",
            supplier_phone="+91-80-6677-8899",
            expected_delivery_date=_date_ahead(7),
            notes="Q2 2026 PPE bulk purchase — hard hats, glasses, gloves, boots.",
            status=PurchaseOrder.OrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        PurchaseOrderItem.objects.bulk_create([
            PurchaseOrderItem(
                order=po_issued,
                product=products["SAFE-001"],
                destination_location=shelf_map["WH-MAIN/1/B/S1"],
                quantity_ordered=50,
                unit_price="380.00",
            ),
            PurchaseOrderItem(
                order=po_issued,
                product=products["SAFE-002"],
                destination_location=shelf_map["WH-MAIN/1/B/S2"],
                quantity_ordered=100,
                unit_price="95.00",
            ),
            PurchaseOrderItem(
                order=po_issued,
                product=products["SAFE-004"],
                destination_location=shelf_map["WH-MAIN/1/B/S4"],
                quantity_ordered=20,
                unit_price="1400.00",
            ),
        ])
        services.issue_purchase_order(po_issued, manager)
        PurchaseOrder.objects.filter(pk=po_issued.pk).update(
            created_at=_days_ago(3),
            updated_at=_days_ago(2),
        )
        po_issued.refresh_from_db()
        self.stdout.write(f"  Created ISSUED PO {po_issued.po_number}")

        # --- 3. PARTIALLY_RECEIVED PO: Hardware Batch #2 -----------------
        po_partial = PurchaseOrder.objects.create(
            supplier_name="Metal Mart Supplies",
            supplier_reference="MMS-INV-2026-441",
            supplier_contact="Vijay Tiwari",
            supplier_email="dispatch@metalmart.in",
            supplier_phone="+91-11-2233-4455",
            expected_delivery_date=_date_ago(2),
            notes=(
                "Second hardware batch. First delivery (Hex Bolts) partially arrived. "
                "Steel Washers fully received. Awaiting remaining Hex Bolt consignment."
            ),
            status=PurchaseOrder.OrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        po_item_h1 = PurchaseOrderItem.objects.create(
            order=po_partial,
            product=products["HARD-001"],
            destination_location=shelf_map["WH-MAIN/G/B/S1"],
            quantity_ordered=500,
            unit_price="8.50",
        )
        po_item_h2 = PurchaseOrderItem.objects.create(
            order=po_partial,
            product=products["HARD-002"],
            destination_location=shelf_map["WH-MAIN/G/B/S2"],
            quantity_ordered=800,
            unit_price="3.20",
        )
        services.issue_purchase_order(po_partial, manager)

        # Receive 300/500 Hex Bolts → PO stays PARTIALLY_RECEIVED
        services.receive_po_item(po_item_h1, 300, admin)
        po_partial.refresh_from_db()

        # Receive all 800 Steel Washers → h2 fully received but h1 is still partial
        services.receive_po_item(po_item_h2, 800, admin)
        po_partial.refresh_from_db()

        PurchaseOrder.objects.filter(pk=po_partial.pk).update(
            created_at=_days_ago(10),
            updated_at=_days_ago(1),
        )
        self.stdout.write(f"  Created PARTIALLY_RECEIVED PO {po_partial.po_number}")

        # --- 4. COMPLETED PO: Electrical Components Jan 2026 -------------
        po_done = PurchaseOrder.objects.create(
            supplier_name="ElectroParts India Ltd",
            supplier_reference="EPI-SO-2026-117",
            supplier_contact="Anita Rao",
            supplier_email="supply@electroparts.in",
            supplier_phone="+91-40-7788-9900",
            expected_delivery_date=_date_ago(75),
            notes="Full delivery of voltage stabilizers and LED work lights. All items verified on receipt.",
            status=PurchaseOrder.OrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        po_item_e1 = PurchaseOrderItem.objects.create(
            order=po_done,
            product=products["ELEC-001"],
            destination_location=shelf_map["WH-MAIN/G/A/S1"],
            quantity_ordered=20,
            unit_price="4200.00",
        )
        po_item_e2 = PurchaseOrderItem.objects.create(
            order=po_done,
            product=products["ELEC-002"],
            destination_location=shelf_map["WH-MAIN/G/A/S2"],
            quantity_ordered=30,
            unit_price="1800.00",
        )
        services.issue_purchase_order(po_done, manager)
        services.receive_po_item(po_item_e1, 20, admin)
        po_done.refresh_from_db()
        services.receive_po_item(po_item_e2, 30, admin)
        po_done.refresh_from_db()  # → COMPLETED

        PurchaseOrder.objects.filter(pk=po_done.pk).update(
            created_at=_days_ago(90),
            updated_at=_days_ago(76),
            received_at=_days_ago(76),
        )
        self.stdout.write(f"  Created COMPLETED PO {po_done.po_number}")

        # --- 5. CANCELLED PO: Paint & Coating Order ----------------------
        po_cancelled = PurchaseOrder.objects.create(
            supplier_name="Rainbow Coatings Co.",
            supplier_reference="RC-QUOTE-2026-033",
            supplier_contact="Deepak Joshi",
            supplier_email="orders@rainbowcoatings.in",
            supplier_phone="+91-20-5566-7788",
            expected_delivery_date=_date_ahead(30),
            notes="Vendor unable to meet delivery deadline — order cancelled. Will re-tender next quarter.",
            status=PurchaseOrder.OrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        PurchaseOrderItem.objects.bulk_create([
            PurchaseOrderItem(
                order=po_cancelled,
                product=products["PANT-001"],
                destination_location=shelf_map["WH-MAIN/1/A/S1"],
                quantity_ordered=10,
                unit_price="3800.00",
            ),
            PurchaseOrderItem(
                order=po_cancelled,
                product=products["PANT-002"],
                destination_location=shelf_map["WH-MAIN/1/A/S2"],
                quantity_ordered=20,
                unit_price="620.00",
            ),
        ])
        services.cancel_purchase_order(po_cancelled, admin)
        PurchaseOrder.objects.filter(pk=po_cancelled.pk).update(
            created_at=_days_ago(20),
            updated_at=_days_ago(18),
        )
        self.stdout.write(f"  Created CANCELLED PO {po_cancelled.po_number}")

    # ------------------------------------------------------------------
    # Work Orders
    # ------------------------------------------------------------------

    def _seed_work_orders(self, products, shelf_map, admin, manager):
        """
        Create 6 WOs covering every status:
          1. DRAFT                   – Electrical Panel Upgrade
          2. ISSUED                  – Warehouse Plumbing Repair
          3. PENDING_INSUFFICIENT_STOCK – Angle Grinder Replacement (HARD-003 short)
          4. COMPLETED_FULLY_USED    – Monthly PPE Distribution
          5. COMPLETED_PARTIALLY_USED – Workshop Equipment Setup
          6. CANCELLED               – Roof Maintenance (deferred)
        """

        # --- 1. DRAFT WO: Electrical Panel Upgrade -----------------------
        wo_draft = WorkOrder.objects.create(
            title="Electrical Panel Upgrade — Block C",
            description=(
                "Replace aging circuit breakers and extension cords in Block C "
                "distribution panel. Scheduled for next maintenance window."
            ),
            priority=WorkOrder.Priority.HIGH,
            assigned_to="Alice Nguyen",
            due_date=_date_ahead(10),
            notes="Coordinate with facilities team before starting.",
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=manager,
            updated_by=manager,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_draft,
                product=products["ELEC-004"],
                source_location=shelf_map["WH-MAIN/G/A/S4"],
                quantity_required=15,
                notes="Replace 15 ageing 16A breakers.",
            ),
            WorkOrderItem(
                work_order=wo_draft,
                product=products["ELEC-003"],
                source_location=shelf_map["WH-MAIN/G/A/S3"],
                quantity_required=10,
                notes="10 extension cords for temporary power routing.",
            ),
        ])
        self.stdout.write(f"  Created DRAFT WO {wo_draft.wo_number}")

        # --- 2. ISSUED WO: Warehouse Plumbing Repair ----------------------
        wo_issued = WorkOrder.objects.create(
            title="Warehouse Plumbing Repair — East Wing",
            description=(
                "Fix two leaking joints in the east-wing cold-water line. "
                "Install new ball valves and re-tape all threaded connections."
            ),
            priority=WorkOrder.Priority.NORMAL,
            assigned_to="Bob Kumar",
            due_date=_date_ahead(3),
            notes="Shut off mains water before starting.",
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=manager,
            updated_by=manager,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_issued,
                product=products["PLMB-001"],
                source_location=shelf_map["WH-MAIN/G/C/S1"],
                quantity_required=8,
            ),
            WorkOrderItem(
                work_order=wo_issued,
                product=products["PLMB-002"],
                source_location=shelf_map["WH-MAIN/G/C/S2"],
                quantity_required=10,
            ),
            WorkOrderItem(
                work_order=wo_issued,
                product=products["PLMB-003"],
                source_location=shelf_map["WH-MAIN/G/C/S3"],
                quantity_required=20,
            ),
        ])
        services.issue_work_order(wo_issued, manager)
        WorkOrder.objects.filter(pk=wo_issued.pk).update(
            created_at=_days_ago(2),
            updated_at=_days_ago(1),
        )
        self.stdout.write(f"  Created ISSUED WO {wo_issued.wo_number}")

        # --- 3. PENDING_INSUFFICIENT_STOCK WO: Angle Grinder Replacement --
        # HARD-003 (Angle Grinder) has only 3 units on shelf 7;
        # this WO requires 5 → triggers PENDING_INSUFFICIENT_STOCK.
        wo_pending = WorkOrder.objects.create(
            title="Angle Grinder Replacement — Maintenance Workshop",
            description=(
                "Replace three worn-out angle grinders and restock drill-bit sets "
                "in the maintenance workshop. Urgent — production scheduled tomorrow."
            ),
            priority=WorkOrder.Priority.URGENT,
            assigned_to="Alice Nguyen",
            due_date=_date_ago(1),  # already overdue
            notes="HARD-003 stock is critically low — escalated to procurement.",
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=admin,
            updated_by=admin,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_pending,
                product=products["HARD-003"],
                source_location=shelf_map["WH-MAIN/G/B/S3"],
                quantity_required=5,  # only 3 available → insufficient
                notes="Only 3 in stock — need 2 more before WO can proceed.",
            ),
            WorkOrderItem(
                work_order=wo_pending,
                product=products["HARD-004"],
                source_location=shelf_map["WH-MAIN/G/B/S4"],
                quantity_required=10,
            ),
        ])
        # issue_work_order detects insufficient HARD-003 stock → PENDING_INSUFFICIENT_STOCK
        services.issue_work_order(wo_pending, admin)
        WorkOrder.objects.filter(pk=wo_pending.pk).update(
            created_at=_days_ago(4),
            updated_at=_days_ago(3),
        )
        self.stdout.write(f"  Created PENDING_INSUFFICIENT_STOCK WO {wo_pending.wo_number}")

        # --- 4. COMPLETED_FULLY_USED WO: Monthly PPE Distribution ---------
        wo_full = WorkOrder.objects.create(
            title="Monthly PPE Distribution — All Floors",
            description=(
                "Issue safety helmets and high-visibility vests to all floor staff "
                "as part of the monthly PPE replenishment programme."
            ),
            priority=WorkOrder.Priority.NORMAL,
            assigned_to="John Chen",
            due_date=_date_ago(30),
            notes="All items distributed to floor supervisors. Signed receipts filed.",
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=manager,
            updated_by=manager,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_full,
                product=products["SAFE-001"],
                source_location=shelf_map["WH-MAIN/1/B/S1"],
                quantity_required=10,
            ),
            WorkOrderItem(
                work_order=wo_full,
                product=products["SAFE-005"],
                source_location=shelf_map["WH-MAIN/1/C/S1"],
                quantity_required=15,
            ),
        ])
        services.issue_work_order(wo_full, manager)
        services.complete_work_order(
            wo_full,
            WorkOrder.WorkOrderStatus.COMPLETED_FULLY_USED,
            manager,
            notes="All 10 hard hats and 15 hi-vis vests issued. Distribution complete.",
        )
        WorkOrder.objects.filter(pk=wo_full.pk).update(
            created_at=_days_ago(35),
            updated_at=_days_ago(30),
            completed_at=_days_ago(30),
        )
        self.stdout.write(f"  Created COMPLETED_FULLY_USED WO {wo_full.wo_number}")

        # --- 5. COMPLETED_PARTIALLY_USED WO: Workshop Equipment Setup -----
        wo_partial = WorkOrder.objects.create(
            title="Workshop Equipment Setup — Painting Bay",
            description=(
                "Set up the new painting bay: lay floor paint, prime metal surfaces, "
                "and provide brush sets and degreaser for the initial clean-down."
            ),
            priority=WorkOrder.Priority.HIGH,
            assigned_to="Alice Nguyen",
            due_date=_date_ago(14),
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=manager,
            updated_by=manager,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_partial,
                product=products["PANT-003"],
                source_location=shelf_map["WH-MAIN/1/A/S3"],
                quantity_required=20,
                notes="Brush sets for primer and top-coat application.",
            ),
            WorkOrderItem(
                work_order=wo_partial,
                product=products["CLEN-001"],
                source_location=shelf_map["WH-MAIN/1/A/S4"],
                quantity_required=15,
                notes="Degreaser for surface preparation before painting.",
            ),
        ])
        services.issue_work_order(wo_partial, manager)
        services.complete_work_order(
            wo_partial,
            WorkOrder.WorkOrderStatus.COMPLETED_PARTIALLY_USED,
            manager,
            notes=(
                "20 brush sets used. Only 13 degreaser units were needed — 2 returned to shelf. "
                "Job completed ahead of schedule."
            ),
        )
        WorkOrder.objects.filter(pk=wo_partial.pk).update(
            created_at=_days_ago(20),
            updated_at=_days_ago(14),
            completed_at=_days_ago(14),
        )
        self.stdout.write(f"  Created COMPLETED_PARTIALLY_USED WO {wo_partial.wo_number}")

        # --- 6. CANCELLED WO: Roof Maintenance Deferred ------------------
        wo_cancelled = WorkOrder.objects.create(
            title="Roof Maintenance — Warehouse A Roof Patch",
            description=(
                "Apply anti-rust primer and epoxy paint to three corroded roof panels. "
                "Deferred due to monsoon — rescheduled for dry season."
            ),
            priority=WorkOrder.Priority.LOW,
            assigned_to="Bob Kumar",
            due_date=_date_ahead(60),
            notes="Cancelled — monsoon season. Rescheduled to Q4 2026.",
            status=WorkOrder.WorkOrderStatus.DRAFT,
            created_by=manager,
            updated_by=manager,
        )
        WorkOrderItem.objects.bulk_create([
            WorkOrderItem(
                work_order=wo_cancelled,
                product=products["PANT-001"],
                source_location=shelf_map["WH-MAIN/1/A/S1"],
                quantity_required=3,
            ),
            WorkOrderItem(
                work_order=wo_cancelled,
                product=products["PANT-002"],
                source_location=shelf_map["WH-MAIN/1/A/S2"],
                quantity_required=5,
            ),
            WorkOrderItem(
                work_order=wo_cancelled,
                product=products["HARD-001"],
                source_location=shelf_map["WH-MAIN/G/B/S1"],
                quantity_required=50,
                notes="Bolts for securing replacement roof panels.",
            ),
        ])
        services.cancel_work_order(wo_cancelled, admin)
        WorkOrder.objects.filter(pk=wo_cancelled.pk).update(
            created_at=_days_ago(5),
            updated_at=_days_ago(5),
        )
        self.stdout.write(f"  Created CANCELLED WO {wo_cancelled.wo_number}")
