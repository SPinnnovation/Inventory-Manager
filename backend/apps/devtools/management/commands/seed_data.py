"""
Management command: seed_data

Populates the inventory app with realistic production-level test data spanning
two warehouses, six product categories, 24 SKUs, and a full stock-movement
audit trail (PO receipts, WO issues, manual adjustments).

Usage
-----
    python manage.py seed_data          # seed if empty
    python manage.py seed_data --reset  # wipe seed data then re-seed
"""

import logging
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.inventory import services
from apps.inventory.models import (
    Category,
    Floor,
    Product,
    Rack,
    Shelf,
    Stock,
    StockMovement,
    Warehouse,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Seed definitions
# ---------------------------------------------------------------------------

USERS = [
    # (email, first_name, last_name, role, password)
    ('admin@example.com',       'Test',  'Admin',   'admin',         'Test@dm1n2026!'),
    ('john.manager@example.com','John',  'Chen',    'floor_manager', 'F100r@mgr2026!'),
    ('alice.staff@example.com', 'Alice', 'Nguyen',  'staff',         'St@ff@2026!'),
    ('bob.viewer@example.com',  'Bob',   'Kumar',   'viewer',        'V1ew3r@2026!'),
]

# Warehouses → floors → racks → shelves
WAREHOUSES = [
    {
        'code': 'WH-MAIN',
        'name': 'Main Warehouse',
        'address': '123 Industrial Avenue, Sector 7',
        'floors': [
            {'level': 'G', 'racks': ['A', 'B', 'C'], 'shelves': ['S1', 'S2', 'S3', 'S4']},
            {'level': '1', 'racks': ['A', 'B', 'C'], 'shelves': ['S1', 'S2', 'S3', 'S4']},
        ],
    },
    {
        'code': 'WH-EAST',
        'name': 'East Wing Storage',
        'address': '45 East Storage Road, Sector 12',
        'floors': [
            {'level': 'G', 'racks': ['A', 'B'], 'shelves': ['S1', 'S2', 'S3']},
        ],
    },
]

CATEGORIES = [
    ('electronics', 'Electronics',        'Electrical equipment, lighting, and control devices.'),
    ('hardware',    'Hardware & Tools',   'Fasteners, hand tools, and power tools.'),
    ('plumbing',    'Plumbing & Fixtures','Pipes, valves, fittings, and sealing materials.'),
    ('paints',      'Paints & Coatings',  'Floor paints, primers, and application tools.'),
    ('safety',      'Safety & PPE',       'Personal protective equipment and safety gear.'),
    ('cleaning',    'Cleaning Supplies',  'Industrial cleaning agents and janitorial supplies.'),
]

# (key, name, sku, category_key, description, uom, base_price, market_price, predictive_price, reorder_point)
PRODUCTS = [
    # --- Electronics ---
    ('volt_stab',       'Voltage Stabilizer 1KVA',   'ELEC-001', 'electronics',
     'Single-phase automatic voltage stabilizer, 1000VA, 220V input/output.',
     'pcs', 4200, 4500, 4350, 5),
    ('led_light',       'LED Work Light 50W',         'ELEC-002', 'electronics',
     'Portable LED work light, IP65 rated, 5000 lumens, 50W.',
     'pcs', 1800, 1950, 1870, 10),
    ('ext_cord',        'Extension Cord 10m',         'ELEC-003', 'electronics',
     '3-pin grounded extension cord, 10 metres, 13A rated.',
     'pcs', 350, 380, 365, 20),
    ('circuit_breaker', 'Circuit Breaker 16A',        'ELEC-004', 'electronics',
     'MCB single-pole, 16A, 240V, DIN rail mount.',
     'pcs', 280, 310, 295, 30),

    # --- Hardware ---
    ('hex_bolt',      'Hex Bolt M8×30',           'HARD-001', 'hardware',
     'Hot-dip galvanised hex bolt, M8×30mm, grade 8.8.',
     'pcs', 8, 9, 9, 500),
    ('washer',        'Steel Washer M8',           'HARD-002', 'hardware',
     'Zinc-plated flat washer M8, DIN 125.',
     'pcs', 3, 4, 3, 1000),
    ('angle_grinder', 'Angle Grinder 4.5"',        'HARD-003', 'hardware',
     'Electric angle grinder 850W, 4.5" disc, 11000 RPM.',
     'pcs', 2400, 2600, 2500, 3),
    ('drill_set',     'Drill Bit Set HSS 13pc',    'HARD-004', 'hardware',
     'High-speed steel drill bit set, 1.5–6.5mm, metal case.',
     'set', 650, 720, 685, 8),

    # --- Plumbing ---
    ('pvc_pipe',    'PVC Pipe 2" × 6m',     'PLMB-001', 'plumbing',
     'uPVC pressure pipe, 2-inch nominal, 6-metre length, PN10.',
     'length', 420, 460, 445, 20),
    ('ball_valve',  'Ball Valve 1/2"',       'PLMB-002', 'plumbing',
     'Full-bore brass ball valve, 1/2" BSP, lever handle.',
     'pcs', 180, 200, 190, 40),
    ('teflon_tape', 'Teflon Tape Roll',      'PLMB-003', 'plumbing',
     'PTFE thread seal tape, 12mm × 10m roll.',
     'roll', 25, 30, 28, 100),
    ('pipe_elbow',  'Pipe Elbow 2" 90°',     'PLMB-004', 'plumbing',
     'uPVC 90-degree elbow, 2-inch socket, solvent weld.',
     'pcs', 55, 65, 60, 50),

    # --- Paints ---
    ('epoxy_paint', 'Epoxy Floor Paint Grey 20L', 'PANT-001', 'paints',
     'Two-part epoxy floor coating, light grey, 20-litre kit.',
     'kit', 3800, 4100, 3950, 5),
    ('rust_primer', 'Anti-Rust Primer Red 4L',    'PANT-002', 'paints',
     'Alkyd-based red oxide anti-corrosion primer, 4-litre tin.',
     'tin', 620, 680, 650, 10),
    ('brush_set',   'Paint Brush Set 6pc',        'PANT-003', 'paints',
     'Synthetic bristle brush set, 1"–3" assorted, 6 pieces.',
     'set', 220, 250, 235, 15),

    # --- Safety & PPE ---
    ('hard_hat',       'Hard Hat Yellow',             'SAFE-001', 'safety',
     'ABS construction helmet, EN397, ratchet adjustment, yellow.',
     'pcs', 380, 420, 400, 20),
    ('safety_glasses', 'Safety Glasses Clear',        'SAFE-002', 'safety',
     'Polycarbonate safety spectacles, anti-scratch, clear lens, EN166.',
     'pcs', 95, 110, 102, 50),
    ('nitrile_gloves', 'Nitrile Gloves M Box/100',    'SAFE-003', 'safety',
     'Powder-free nitrile examination gloves, medium, 100/box.',
     'box', 280, 320, 305, 20),
    ('safety_boots',   'Safety Boots Size 42',        'SAFE-004', 'safety',
     'S3 steel-toe-cap safety boots, size 42, EN ISO 20345.',
     'pcs', 1400, 1550, 1480, 5),
    ('hi_vis',         'High-Vis Vest Orange',         'SAFE-005', 'safety',
     'Class 2 high-visibility waistcoat, orange with reflective tape.',
     'pcs', 150, 180, 165, 30),

    # --- Cleaning ---
    ('degreaser',  'Industrial Degreaser 5L',        'CLEN-001', 'cleaning',
     'Solvent-free industrial degreaser, 5-litre concentrate.',
     'can', 480, 520, 500, 10),
    ('floor_mat',  'Absorbent Floor Mat 60×90cm',    'CLEN-002', 'cleaning',
     'Oil-absorbent polypropylene floor mat, 60×90cm.',
     'pcs', 120, 140, 130, 25),
    ('mop_bucket', 'Mop & Bucket Set',               'CLEN-003', 'cleaning',
     'Heavy-duty wringer bucket with loop mop, 25-litre capacity.',
     'set', 750, 820, 785, 3),
    ('bin_liner',  'Heavy Duty Bin Liner 240L',       'CLEN-004', 'cleaning',
     'Extra-heavy duty polyethylene bin liner, 240-litre, pack of 10.',
     'pack', 95, 110, 102, 15),
]

# (product_key, shelf_key, po_qty, po_ref, wo_qty, wo_ref)
# wo_qty=None means no outbound movement for this entry.
# Intentionally low final stocks on select items to exercise reorder alerts:
#   angle_grinder: 7 - 4 = 3  = reorder_point (at limit)
#   safety_boots:  9 - 4 = 5  = reorder_point (at limit)
#   mop_bucket:    5 - 2 = 3  = reorder_point (at limit)
#   volt_stab WH-MAIN: 12 - 8 = 4 < 5 reorder (BELOW — triggers alert)
STOCK_PLAN = [
    # ---------- WH-MAIN / Ground / Rack A — Electronics ----------
    ('volt_stab',       'WH-MAIN/G/A/S1', 12,   'PO-2026-001',  8,    'WO-2026-010'),
    ('led_light',       'WH-MAIN/G/A/S2', 40,   'PO-2026-001',  8,    'WO-2026-011'),
    ('ext_cord',        'WH-MAIN/G/A/S3', 80,   'PO-2026-001',  15,   'WO-2026-012'),
    ('circuit_breaker', 'WH-MAIN/G/A/S4', 120,  'PO-2026-001',  30,   'WO-2026-013'),

    # ---------- WH-MAIN / Ground / Rack B — Hardware ----------
    ('hex_bolt',      'WH-MAIN/G/B/S1', 2000, 'PO-2026-002', 350,  'WO-2026-020'),
    ('washer',        'WH-MAIN/G/B/S2', 5000, 'PO-2026-002', 800,  'WO-2026-020'),
    ('angle_grinder', 'WH-MAIN/G/B/S3',    7, 'PO-2026-002',   4,  'WO-2026-021'),
    ('drill_set',     'WH-MAIN/G/B/S4',   30, 'PO-2026-002',   6,  'WO-2026-021'),

    # ---------- WH-MAIN / Ground / Rack C — Plumbing ----------
    ('pvc_pipe',    'WH-MAIN/G/C/S1',  60,  'PO-2026-003',  10,  'WO-2026-030'),
    ('ball_valve',  'WH-MAIN/G/C/S2', 150,  'PO-2026-003',  25,  'WO-2026-030'),
    ('teflon_tape', 'WH-MAIN/G/C/S3', 400,  'PO-2026-003',  60,  'WO-2026-031'),
    ('pipe_elbow',  'WH-MAIN/G/C/S4', 200,  'PO-2026-003',  40,  'WO-2026-031'),

    # ---------- WH-MAIN / First / Rack A — Paints + Cleaning ----------
    ('epoxy_paint', 'WH-MAIN/1/A/S1',  8,   'PO-2026-004',   3,  'WO-2026-040'),
    ('rust_primer', 'WH-MAIN/1/A/S2',  40,  'PO-2026-004',   8,  'WO-2026-040'),
    ('brush_set',   'WH-MAIN/1/A/S3',  50,  'PO-2026-004',  12,  'WO-2026-041'),
    ('degreaser',   'WH-MAIN/1/A/S4',  35,  'PO-2026-005',   7,  'WO-2026-050'),

    # ---------- WH-MAIN / First / Rack B — Safety & PPE ----------
    ('hard_hat',       'WH-MAIN/1/B/S1',  60,  'PO-2026-006',  15,  'WO-2026-060'),
    ('safety_glasses', 'WH-MAIN/1/B/S2', 200,  'PO-2026-006',  40,  'WO-2026-060'),
    ('nitrile_gloves', 'WH-MAIN/1/B/S3',  80,  'PO-2026-006',  20,  'WO-2026-061'),
    ('safety_boots',   'WH-MAIN/1/B/S4',   9,  'PO-2026-006',   4,  'WO-2026-061'),

    # ---------- WH-MAIN / First / Rack C — Safety (cont.) + Cleaning ----------
    ('hi_vis',     'WH-MAIN/1/C/S1', 100,  'PO-2026-006',  25,  'WO-2026-062'),
    ('floor_mat',  'WH-MAIN/1/C/S2',  60,  'PO-2026-007',  12,  'WO-2026-070'),
    ('mop_bucket', 'WH-MAIN/1/C/S3',   5,  'PO-2026-007',   2,  'WO-2026-070'),
    ('bin_liner',  'WH-MAIN/1/C/S4',  40,  'PO-2026-007',   8,  'WO-2026-071'),

    # ---------- WH-EAST / Ground / Rack A — Overflow ----------
    ('volt_stab',      'WH-EAST/G/A/S1',  10,  'PO-2026-008', None, None),
    ('hex_bolt',       'WH-EAST/G/A/S2', 1000, 'PO-2026-008', None, None),
    ('nitrile_gloves', 'WH-EAST/G/A/S3',  30,  'PO-2026-008', None, None),

    # ---------- WH-EAST / Ground / Rack B — Overflow ----------
    ('pvc_pipe',    'WH-EAST/G/B/S1',  20,  'PO-2026-008', None, None),
    ('epoxy_paint', 'WH-EAST/G/B/S2',   5,  'PO-2026-008', None, None),
    ('bin_liner',   'WH-EAST/G/B/S3',  15,  'PO-2026-008', None, None),
]

# Manual stock adjustments applied after the main movements.
# (product_key, shelf_key, delta, ref, reason)
ADJUSTMENTS = [
    ('ext_cord',    'WH-MAIN/G/A/S3',   5, 'ADJ-2026-001',
     'Physical count correction: 5 extra units found on shelf.'),
    ('washer',      'WH-MAIN/G/B/S2', -50, 'ADJ-2026-002',
     'Write-off: 50 corroded washers disposed — batch QC failure.'),
    ('teflon_tape', 'WH-MAIN/G/C/S3',  50, 'ADJ-2026-003',
     'Site return: 50 rolls transferred back from Job-Site-7.'),
    ('hard_hat',    'WH-MAIN/1/B/S1', -10, 'ADJ-2026-004',
     'Issued to site team without formal WO — retrospective deduction.'),
    ('drill_set',   'WH-MAIN/G/B/S4',   4, 'ADJ-2026-005',
     'Supplier credit note fulfilled: 4 sets received as replacement.'),
]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = 'Seed production-level test data for the inventory app.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing inventory seed data before re-seeding.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self._reset()

        if Warehouse.objects.exists():
            self.stdout.write(self.style.WARNING(
                'Seed data already present. Run with --reset to wipe and re-seed.'
            ))
            return

        with transaction.atomic():
            self.stdout.write('  → Creating users …')
            user_map = self._seed_users()
            admin_user = user_map['admin']

            self.stdout.write('  → Building warehouse hierarchy …')
            shelf_map = self._seed_warehouses()

            self.stdout.write('  → Creating categories …')
            cat_map = self._seed_categories()

            self.stdout.write('  → Creating products …')
            prod_map = self._seed_products(cat_map)

        # Stock movements run outside the wrapping transaction so each call
        # to adjust_stock uses its own atomic block (as the service requires).
        self.stdout.write('  → Seeding stock & movements …')
        self._seed_stock(prod_map, shelf_map, admin_user)

        self.stdout.write(self.style.SUCCESS(
            '\n✓ Seed complete.\n'
            f'  Users:      {User.objects.filter(email__endswith="@example.com").count()}\n'
            f'  Warehouses: {Warehouse.objects.count()}\n'
            f'  Shelves:    {Shelf.objects.count()}\n'
            f'  Categories: {Category.objects.count()}\n'
            f'  Products:   {Product.objects.count()}\n'
            f'  Stock rows: {Stock.objects.count()}\n'
            f'  Movements:  {StockMovement.objects.count()}\n'
        ))

    # -------------------------------------------------------------------
    # Reset
    # -------------------------------------------------------------------

    def _reset(self):
        self.stdout.write(self.style.WARNING('Resetting seed data …'))
        # Deletion order respects FK constraints / on_delete=PROTECT chains.
        # QuerySet.delete() bypasses the model-level append-only guard on
        # StockMovement (which only blocks instance.delete()).
        StockMovement.objects.all().delete()
        Stock.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Shelf.objects.all().delete()
        Rack.objects.all().delete()
        Floor.objects.all().delete()
        Warehouse.objects.all().delete()
        User.objects.filter(email__endswith='@example.com').delete()
        self.stdout.write(self.style.SUCCESS('  Reset complete.'))

    # -------------------------------------------------------------------
    # Users
    # -------------------------------------------------------------------

    def _seed_users(self):
        user_map = {}
        for email, first, last, role, pwd in USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'role': role,
                    'is_active': True,
                },
            )
            if created:
                user.set_password(pwd)
                user.save(update_fields=['password'])
                self.stdout.write(f'     + {email}  [{role}]')
            user_map[role] = user
        return user_map

    # -------------------------------------------------------------------
    # Physical hierarchy
    # -------------------------------------------------------------------

    def _seed_warehouses(self):
        shelf_map = {}  # 'WH-CODE/floor_level/rack_id/shelf_id' → Shelf

        for wd in WAREHOUSES:
            wh, _ = Warehouse.objects.get_or_create(
                code=wd['code'],
                defaults={'name': wd['name'], 'address': wd['address']},
            )
            for fd in wd['floors']:
                floor, _ = Floor.objects.get_or_create(
                    warehouse=wh,
                    level=fd['level'],
                )
                for rack_id in fd['racks']:
                    rack, _ = Rack.objects.get_or_create(
                        floor=floor,
                        identifier=rack_id,
                    )
                    for shelf_id in fd['shelves']:
                        barcode = f'BC-{wd["code"]}-{fd["level"]}{rack_id}-{shelf_id}'
                        shelf, _ = Shelf.objects.get_or_create(
                            rack=rack,
                            identifier=shelf_id,
                            defaults={
                                'barcode_or_rfid': barcode,
                                'max_weight_capacity': 500,
                            },
                        )
                        key = f'{wd["code"]}/{fd["level"]}/{rack_id}/{shelf_id}'
                        shelf_map[key] = shelf

        self.stdout.write(f'     {len(shelf_map)} shelves across {Warehouse.objects.count()} warehouses')
        return shelf_map

    # -------------------------------------------------------------------
    # Categories
    # -------------------------------------------------------------------

    def _seed_categories(self):
        cat_map = {}
        for key, name, desc in CATEGORIES:
            cat, _ = Category.objects.get_or_create(name=name, defaults={'description': desc})
            cat_map[key] = cat
        return cat_map

    # -------------------------------------------------------------------
    # Products
    # -------------------------------------------------------------------

    @staticmethod
    def _price_history(market_price: float, months: int = 6) -> list:
        """Generate a plausible 6-month price-tracking history for Product.meta."""
        history = []
        today = date.today()
        for i in range(months, -1, -1):
            d = today - timedelta(days=i * 30)
            # Small sinusoidal fluctuation — ±4 % over the period
            factor = 1 + (((i % 4) - 2) * 0.02)
            history.append({'date': str(d), 'price': round(market_price * factor, 2)})
        return history

    def _seed_products(self, cat_map):
        prod_map = {}
        for row in PRODUCTS:
            key, name, sku, cat_key, desc, uom, base, market, predictive, reorder = row
            prod, _ = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    'name': name,
                    'category': cat_map[cat_key],
                    'description': desc,
                    'unit_of_measure': uom,
                    'base_price': base,
                    'market_price': market,
                    'predictive_price': predictive,
                    'reorder_point': reorder,
                    'meta': self._price_history(float(market)),
                },
            )
            prod_map[key] = prod
        return prod_map

    # -------------------------------------------------------------------
    # Stock + movements
    # -------------------------------------------------------------------

    def _movement_exists(self, reference_id: str, product, shelf) -> bool:
        """Idempotency guard: skip if a movement with this ref already exists."""
        return StockMovement.objects.filter(
            reference_id=reference_id,
            stock__product=product,
            stock__location=shelf,
        ).exists()

    def _adjust(self, *, product, shelf, delta, movement_type, user, ref, reason):
        if self._movement_exists(ref, product, shelf):
            return
        services.adjust_stock(
            product=product,
            location=shelf,
            delta=delta,
            movement_type=movement_type,
            user=user,
            reference_id=ref,
            reason=reason,
        )

    def _seed_stock(self, prod_map, shelf_map, admin_user):
        MT = StockMovement.MovementType

        # PO receipts and WO issues
        for entry in STOCK_PLAN:
            prod_key, shelf_key, po_qty, po_ref, wo_qty, wo_ref = entry
            product = prod_map[prod_key]
            shelf   = shelf_map[shelf_key]

            self._adjust(
                product=product, shelf=shelf,
                delta=po_qty, movement_type=MT.PO_RECEIPT,
                user=admin_user,
                ref=po_ref,
                reason=f'Initial stock receipt — {po_ref}',
            )

            if wo_qty and wo_ref:
                self._adjust(
                    product=product, shelf=shelf,
                    delta=-wo_qty, movement_type=MT.WO_ISSUE,
                    user=admin_user,
                    ref=wo_ref,
                    reason=f'Work order fulfilment — {wo_ref}',
                )

        # Manual adjustments
        for prod_key, shelf_key, delta, ref, reason in ADJUSTMENTS:
            product = prod_map[prod_key]
            shelf   = shelf_map[shelf_key]
            mtype   = MT.ADJUSTMENT_ADD if delta > 0 else MT.ADJUSTMENT_SUB
            self._adjust(
                product=product, shelf=shelf,
                delta=delta, movement_type=mtype,
                user=admin_user,
                ref=ref, reason=reason,
            )

        self.stdout.write(
            f'     {Stock.objects.count()} stock rows, '
            f'{StockMovement.objects.count()} movements recorded'
        )
