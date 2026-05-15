import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin, IsAdminOrFloorManager
from core.pagination import StandardResultsSetPagination
from . import services
from .filters import (
    PurchaseOrderFilter, PurchaseOrderItemFilter,
    WorkOrderFilter, WorkOrderItemFilter,
)
from .models import (
    PurchaseOrder, PurchaseOrderItem,
    WorkOrder, WorkOrderItem,
)
from .permissions import IsAdminOrFloorManagerOrStaff
from .serializers import (
    PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    WorkOrderSerializer, WorkOrderItemSerializer, ReceivePOItemSerializer, CompleteWorkOrderSerializer
)
from .tasks import notify_po_status_change, notify_wo_status_change


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Purchase Orders
# ---------------------------------------------------------------------------

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    filterset_class = PurchaseOrderFilter
    pagination_class = StandardResultsSetPagination
    search_fields    = ['po_number', 'supplier_name', 'supplier_reference']
    ordering_fields  = ['po_number', 'status', 'expected_delivery_date', 'created_at']

    def get_queryset(self):
        return (
            PurchaseOrder.objects
            .select_related('created_by', 'updated_by')
            .prefetch_related(
                'items__product',
                'items__destination_location__rack__floor__warehouse',
            )
            .order_by('-created_at')
        )   # Optimize queryset with select_related and prefetch_related to reduce DB queries when accessing related fields in serializers and views. Orders by most recent first.
        
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'destroy':
            return [IsAdminOrFloorManager()] 
        else:
            return [IsAdminOrFloorManagerOrStaff()]
        
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user) # Set created_by and updated_by to the current user when creating a new purchase order.        
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user) # Update the updated_by field to the current user when updating a purchase order.
        
    @action(detail=True, methods=['post'], url_path='issue')
    def issue(self, request, pk=None):
        """ DRAFT -> ISSUED """
        po = self.get_object() # Get the purchase order object based on the provided primary key (pk) in the URL.
        
        try:
            updated = services.issue_purchase_order(po, request.user)   # Call the service function to issue the purchase order, which handles the business logic of transitioning the PO status and any related operations. We pass the current
            
            notify_po_status_change.delay(updated.pk)   # Trigger asynchronous notification task for PO status change after successfully issuing the purchase order. We pass the updated
            
            return Response(self.get_serializer(updated).data) 
        
        except services.InvalidOrderTransitionError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel the PO (any non-COMPLETED status -> CANCELLED)."""
        po = self.get_object() # Get the purchase order object based on the provided primary key (pk) in the URL.
        
        try:
            updated = services.cancel_purchase_order(po, request.user) # Call the service function to cancel the purchase order, which handles the business logic of transitioning the PO status to cancelled and any related operations. We pass the current
            
            notify_po_status_change.delay(updated.pk) # Trigger asynchronous notification task for PO status change after successfully cancelling the purchase order. We pass the updated
            
            return Response(self.get_serializer(updated).data)
        
        except services.InvalidOrderTransitionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        
        
# ---------------------------------------------------------------------------
# Purchase Order Items
# ---------------------------------------------------------------------------

class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderItemSerializer
    filterset_class = PurchaseOrderItemFilter
    pagination_class = StandardResultsSetPagination
    search_fields    = ['product__name', 'product__sku']
    ordering_fields  = ['product__name', 'quantity_ordered', 'quantity_received']

    def get_queryset(self):
        return (
            PurchaseOrderItem.objects
            .select_related(
                'order',
                'product',
                'destination_location__rack__floor__warehouse',
            )
            .order_by('order__po_number', 'product__name')
        )   # Optimize queryset with select_related to reduce DB queries when accessing related fields in serializers and views. Orders by PO number and product name.
        
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'receive':
            return [IsAdminOrFloorManagerOrStaff()]
        if self.action == 'destroy':
            return [IsAdmin()]
        return [IsAdminOrFloorManager()]
    
    @action(detail=True, methods=['post'], url_path='receive')
    def receive(self, request, pk=None):
        """
        Mark units as received for this line item.
        Creates a PO_RECEIPT StockMovement and updates PO status.
        POST body: { "quantity": 10 }
        """
        item = self.get_object()
        input_serializer = ReceivePOItemSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        
        try:
            updated = services.receive_po_item(
                po_item=item,
                quantity=input_serializer.validated_data['quantity'],
                user=request.user,
            ) # Call the service function to receive the specified quantity for the purchase order item, which handles the business logic of updating the received quantity, creating stock movements, and potentially updating the PO status. We pass the current
            
            notify_po_status_change.delay(updated.order.pk) # Trigger asynchronous notification task for PO status change after successfully receiving the purchase order item. We pass the primary
            
            return Response(PurchaseOrderItemSerializer(updated, context={'request': request}).data)
        
        except services.InvalidOrderTransitionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Work Orders
# ---------------------------------------------------------------------------

class WorkOrderViewSet(viewsets.ModelViewSet):
    serializer_class = WorkOrderSerializer
    filterset_class = WorkOrderFilter
    pagination_class = StandardResultsSetPagination
    search_fields    = ['wo_number', 'title', 'description', 'assigned_to']
    ordering_fields  = ['wo_number', 'status', 'priority', 'due_date', 'created_at']

    def get_queryset(self):
        return (
            WorkOrder.objects
            .select_related('created_by', 'updated_by')
            .prefetch_related(
                'items__product',
                'items__source_location__rack__floor__warehouse',
            )
            .order_by('-created_at')
        ) # Optimize queryset with select_related and prefetch_related to reduce DB queries when accessing related fields in serializers and views. Orders by most recent first.

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action in ('issue', 'complete', 'cancel'):
            return [IsAdminOrFloorManagerOrStaff()]
        if self.action == 'destroy':
            return [IsAdmin()]
        return [IsAdminOrFloorManager()]  # create, update, partial_update

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user) # Set created_by and updated_by to the current user when creating a new work order.

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user) # Update the updated_by field to the current user when updating a work order.
        
    @action(detail=True, methods=['post'], url_path='issue')
    def issue(self, request, pk=None):
        """DRAFT → ISSUED (or PENDING_INSUFFICIENT_STOCK if stock is short)."""
        wo = self.get_object()
        
        try:
            updated = services.issue_work_order(wo, request.user)  # Call the service function to issue the work order, which handles the business logic of checking stock availability, updating the WO status to either ISSUED or PENDING_INSUFFICIENT_STOCK, and any related operations. We pass the current
            
            notify_wo_status_change.delay(updated.pk) # Trigger asynchronous notification task for WO status change after successfully issuing the work order. We pass the primary key of the updated work order to the task.     
            
            return Response(self.get_serializer(updated).data) # Return the updated work order data in the response using the serializer.
        
        except services.InvalidOrderTransitionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """
        Deduct stock for all items and close the WO.
        POST body: { "completion_status": "COMPLETED_FULLY_USED", "notes": "..." }
        """
        wo = self.get_object()
        input_serializer = CompleteWorkOrderSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        
        try:
            updated = services.complete_work_order(
                wo=wo,
                completion_status=input_serializer.validated_data['completion_status'],
                user=request.user,
                notes=input_serializer.validated_data.get('notes', ''),
            )   # Call the service function to complete the work order, which handles the business logic of checking if the WO can be completed, deducting stock for all items based on their quantity required and available stock, updating the WO status to the specified completion status, saving any notes, and any related operations. We pass the current
            
            notify_wo_status_change.delay(updated.pk) # Trigger asynchronous notification task for WO status change after successfully completing the work order. We pass the primary key of the updated work order to the task.
            
            return Response(self.get_serializer(updated).data) # Return the updated work order data in the response using the serializer.
        
        except services.InvalidOrderTransitionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel the WO (any non-terminal status)."""
        wo = self.get_object() # Get the work order object based on the provided primary key (pk) in the URL.        
        
        try:
            updated = services.cancel_work_order(wo, request.user) # Call the service function to cancel the work order, which handles the business logic of transitioning the WO status to cancelled and any related operations. We pass the current
            
            notify_wo_status_change.delay(updated.pk) # Trigger asynchronous notification task for WO status change after successfully canceling the work order. We pass the primary key of the updated work order to the task.
            
            return Response(self.get_serializer(updated).data) # Return the updated work order data in the response using the serializer.
        
        except services.InvalidOrderTransitionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)



# ---------------------------------------------------------------------------
# Work Order Items
# ---------------------------------------------------------------------------
class WorkOrderItemViewSet(viewsets.ModelViewSet):
    """CRUD for WO line items. Mutation is only allowed while the WO is DRAFT."""

    serializer_class = WorkOrderItemSerializer
    filterset_class = WorkOrderItemFilter
    pagination_class = StandardResultsSetPagination
    search_fields    = ['product__name', 'product__sku']
    ordering_fields  = ['product__name', 'quantity_required', 'quantity_issued']

    def get_queryset(self):
        return (
            WorkOrderItem.objects
            .select_related(
                'work_order',
                'product',
                'source_location__rack__floor__warehouse',
            )
            .order_by('work_order__wo_number', 'product__name')
        )   # Optimize queryset with select_related to reduce DB queries when accessing related fields in serializers and views. Orders by WO number and product name.

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'destroy':
            return [IsAdmin()]
        return [IsAdminOrFloorManager()]  # create, update, partial_update