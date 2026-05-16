import logging
from decimal import Decimal

from django.core.cache import cache
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import Product, Shelf, Stock, StockMovement
from apps.orders.models import PurchaseOrder, WorkOrder

from .serializers import (
    BlockedWOSerializer,
    BurnRateSerializer,
    LowStockSerializer,
    OverduePOSerializer,
    RecentMovementSerializer,
)

logger = logging.getLogger(__name__)

_SUMMARY_CACHE_KEY = 'analytics:dashboard:summary'
_BURN_RATES_CACHE_KEY = 'analytics:burn_rates'
_SUMMARY_TTL = 300  # 5 minutes


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = cache.get(_SUMMARY_CACHE_KEY)
        if data is None:
            data = self._compute()
            cache.set(_SUMMARY_CACHE_KEY, data, _SUMMARY_TTL)
        return Response(data)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute(self):
        today = timezone.now().date()

        # ---- KPIs ----
        total_inventory_value = (
            Stock.objects
            .filter(product__base_price__isnull=False)
            .annotate(
                line_value=ExpressionWrapper(
                    F('quantity') * F('product__base_price'),
                    output_field=DecimalField(max_digits=20, decimal_places=2),
                )
            )
            .aggregate(total=Sum('line_value'))['total']
        ) or Decimal('0.00')

        total_sku_count = (
            Stock.objects.filter(quantity__gt=0).values('product').distinct().count()
        )

        active_po_count = PurchaseOrder.objects.filter(
            status__in=[
                PurchaseOrder.OrderStatus.ISSUED,
                PurchaseOrder.OrderStatus.PARTIALLY_RECEIVED,
            ]
        ).count()

        active_wo_count = WorkOrder.objects.filter(
            status__in=[
                WorkOrder.WorkOrderStatus.ISSUED,
                WorkOrder.WorkOrderStatus.PENDING_INSUFFICIENT_STOCK,
            ]
        ).count()

        # Low-stock products (total stock <= reorder_point)
        low_stock_qs = (
            Product.objects
            .filter(reorder_point__isnull=False, is_active=True)
            .annotate(total_qty=Sum('stocks__quantity'))
            .filter(total_qty__lte=F('reorder_point'))
            .order_by('total_qty')
        )
        low_stock_count = low_stock_qs.count()

        # Blocked work orders
        blocked_wo_qs = WorkOrder.objects.filter(
            status=WorkOrder.WorkOrderStatus.PENDING_INSUFFICIENT_STOCK
        ).order_by('-created_at')
        blocked_wo_count = blocked_wo_qs.count()

        # Overdue purchase orders
        overdue_po_qs = (
            PurchaseOrder.objects
            .filter(expected_delivery_date__lt=today)
            .exclude(
                status__in=[
                    PurchaseOrder.OrderStatus.COMPLETED,
                    PurchaseOrder.OrderStatus.CANCELLED,
                ]
            )
            .order_by('expected_delivery_date')
        )
        overdue_po_count = overdue_po_qs.count()

        # Location utilisation
        total_shelves = Shelf.objects.filter(is_active=True).count()
        occupied_shelves = (
            Stock.objects.filter(quantity__gt=0).values('location').distinct().count()
        )

        # ---- Alerts (bounded lists) ----
        low_stock_items = LowStockSerializer(
            [
                {
                    'id': p.id,
                    'name': p.name,
                    'sku': p.sku,
                    'unit_of_measure': p.unit_of_measure,
                    'reorder_point': p.reorder_point,
                    'total_qty': p.total_qty or 0,
                }
                for p in low_stock_qs[:10]
            ],
            many=True,
        ).data

        blocked_work_orders = BlockedWOSerializer(
            [
                {
                    'id': wo.id,
                    'wo_number': wo.wo_number,
                    'title': wo.title,
                    'priority': wo.priority,
                    'created_at': wo.created_at,
                }
                for wo in blocked_wo_qs
            ],
            many=True,
        ).data

        overdue_purchase_orders = OverduePOSerializer(
            [
                {
                    'id': po.id,
                    'po_number': po.po_number,
                    'supplier_name': po.supplier_name,
                    'expected_delivery_date': po.expected_delivery_date,
                    'days_overdue': (today - po.expected_delivery_date).days,
                }
                for po in overdue_po_qs
            ],
            many=True,
        ).data

        # ---- Recent movements ----
        movement_qs = (
            StockMovement.objects
            .select_related('stock__product', 'stock__location', 'user')
            .order_by('-timestamp')[:15]
        )
        recent_movements = RecentMovementSerializer(
            [
                {
                    'product_name': m.stock.product.name,
                    'product_sku': m.stock.product.sku,
                    'location': str(m.stock.location),
                    'quantity_changed': m.quantity_changed,
                    'movement_type': m.movement_type,
                    'reference_id': m.reference_id,
                    'user_email': m.user.email,
                    'timestamp': m.timestamp,
                }
                for m in movement_qs
            ],
            many=True,
        ).data

        # ---- Burn rates (from separate long-lived cache key) ----
        burn_rates = cache.get(_BURN_RATES_CACHE_KEY) or []
        burn_rates_data = BurnRateSerializer(burn_rates[:10], many=True).data

        # ---- Price trends (products with non-empty meta price history) ----
        price_trends = list(
            Product.objects
            .filter(meta__isnull=False, is_active=True)
            .exclude(meta=[])
            .values('id', 'name', 'sku', 'meta')[:20]
        )

        return {
            'kpis': {
                'total_inventory_value': str(total_inventory_value),
                'total_sku_count': total_sku_count,
                'active_po_count': active_po_count,
                'active_wo_count': active_wo_count,
                'low_stock_count': low_stock_count,
                'blocked_wo_count': blocked_wo_count,
                'overdue_po_count': overdue_po_count,
                'total_shelves': total_shelves,
                'occupied_shelves': occupied_shelves,
            },
            'alerts': {
                'low_stock_items': low_stock_items,
                'blocked_work_orders': blocked_work_orders,
                'overdue_purchase_orders': overdue_purchase_orders,
            },
            'recent_movements': recent_movements,
            'burn_rates': burn_rates_data,
            'price_trends': price_trends,
            'cached_at': timezone.now().isoformat(),
        }
