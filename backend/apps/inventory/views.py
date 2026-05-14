import logging

from django.shortcuts import render
from django.http import HttpResponse
from django.db.models import Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin, IsAdminOrFloorManager
from core.pagination import StandardResultsSetPagination

from . import services
from .filters import CategoryFilter, ProductFilter, StockFilter, StockMovementFilter
from .models import Category, Floor, Product, Rack, Shelf, Stock, StockMovement, Warehouse
from .permissions import CanAdjustStock, IsAdminOrFloorManagerOrReadOnly
from .serializers import (
    CategorySerializer,
    FloorSerializer,
    ProductSerializer,
    RackSerializer,
    ShelfSerializer,
    StockAdjustSerializer,
    StockMovementSerializer,
    StockSerializer,
    WarehouseSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Physical Hierarchy ViewSets
# ---------------------------------------------------------------------------

class WarehouseViewSet(viewsets.ModelViewSet):
    """CRUD for warehouses. Write access restricted to Admins."""
    queryset = Warehouse.objects.all().order_by('code')
    serializer_class = WarehouseSerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name', 'created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.select_related('warehouse').all()
    serializer_class = FloorSerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['warehouse', 'is_active']
    search_fields = ['level', 'warehouse__code']
    ordering_fields = ['warehouse', 'level']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.select_related('floor__warehouse').all()
    serializer_class = RackSerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['floor', 'is_active']
    search_fields = ['identifier', 'floor__level']
    ordering_fields = ['floor', 'identifier']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


class ShelfViewSet(viewsets.ModelViewSet):
    queryset = Shelf.objects.select_related('rack__floor__warehouse').all()
    serializer_class = ShelfSerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['rack', 'is_active']
    search_fields = ['identifier', 'barcode_or_rfid']
    ordering_fields = ['rack', 'identifier']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Product ViewSet
# ---------------------------------------------------------------------------

class ProductViewSet(viewsets.ModelViewSet):
    """
    Product catalog. All authenticated users can read.
    Admin and Floor Manager may create/update/delete.
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    filterset_class = ProductFilter
    pagination_class = StandardResultsSetPagination
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'sku', 'base_price', 'reorder_point', 'created_at']

    def get_queryset(self):
        return (
            Product.objects
            .select_related('category')
            .annotate(total_quantity=Sum('stocks__quantity'))
            .order_by('name')
        )


# ---------------------------------------------------------------------------
# Category ViewSet
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    """
    Product category CRUD. All authenticated users can read.
    Admin only may create/update/delete.
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrFloorManagerOrReadOnly]
    filterset_class = CategoryFilter
    pagination_class = StandardResultsSetPagination
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Stock ViewSet
# ---------------------------------------------------------------------------

class StockViewSet(viewsets.ModelViewSet):
    """
    Manage stock records (product × location).
    The `adjust` action is the canonical way to move stock; it records an
    immutable StockMovement and enforces non-negative quantity.
    """
    serializer_class = StockSerializer
    filterset_class = StockFilter
    pagination_class = StandardResultsSetPagination
    search_fields = ['product__name', 'product__sku', 'location__identifier']
    ordering_fields = ['quantity', 'product__name', 'updated_at']

    def get_queryset(self):
        return (
            Stock.objects
            .select_related('product', 'location__rack__floor__warehouse')
            .order_by('product__name')
        )

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'adjust':
            return [CanAdjustStock()]
        return [IsAdminOrFloorManager()]

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """
        Adjust the quantity of an existing stock record.

        POST /inventory/stock/{pk}/adjust/
        {
            "delta": "10.0000",
            "movement_type": "PO_RECEIPT",
            "reference_id": "PO-1029",   // optional
            "reason": "Weekly replenishment",  // optional
            "version": 3                  // optional; optimistic lock
        }
        """
        stock = self.get_object()
        serializer = StockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        try:
            updated_stock, _movement = services.adjust_stock(
                product=stock.product,
                location=stock.location,
                delta=vd['delta'],
                movement_type=vd['movement_type'],
                user=request.user,
                reference_id=vd.get('reference_id', ''),
                reason=vd.get('reason', ''),
                expected_version=vd.get('version'),
            )
        except services.InsufficientStockError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except services.OptimisticLockError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(
            StockSerializer(updated_stock).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Stock Movement ViewSet — read-only audit log
# ---------------------------------------------------------------------------

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Immutable audit trail of all stock movements.
    Movements are created automatically through Stock.adjust; they are never
    created, updated, or deleted directly via this endpoint.
    """
    serializer_class = StockMovementSerializer
    filterset_class = StockMovementFilter
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated]
    ordering_fields = ['timestamp', 'movement_type', 'quantity_changed']

    def get_queryset(self):
        return (
            StockMovement.objects
            .select_related('stock__product', 'stock__location__rack__floor__warehouse', 'user')
            .order_by('-timestamp')
        )
