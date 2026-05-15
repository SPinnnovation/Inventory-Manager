import logging
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import StockMovement, Stock
from apps.inventory.services import InsufficientStockError, adjust_stock
from .models import PurchaseOrder, WorkOrder, WorkOrderItem, PurchaseOrderItem


class InvalidOrderTransitionError(Exception):
    """Raised when a requested status transition is not permitted."""




logger = logging.getLogger(__name__) # Logger for this module


# ----------------------------------------------------------------------------
# Purchase Order Services
# ----------------------------------------------------------------------------

def issue_purchase_order(po: PurchaseOrder, user) -> PurchaseOrder:
    """Transition: DRAFT → ISSUED. Requires at least one line item."""
    if po.status != PurchaseOrder.OrderStatus.DRAFT:
        raise InvalidOrderTransitionError(
            f'Cannot issue PO "{po.po_number}" with status "{po.get_status_display()}". '
            'Only DRAFT orders may be issued.'
        )
        
    if not po.items.exists():
        raise InvalidOrderTransitionError(
            f'Cannot issue PO "{po.po_number}" — it has no line items.'    
        )
        
    with transaction.atomic():
        po.status = PurchaseOrder.OrderStatus.ISSUED
        po.updated_by = user
        po.save(update_fields=['status', 'updated_by', 'updated_at'])
        
    logger.info('PO "%s" issued by %s', po.po_number, user.email)
    
    return po


def receive_po_item(po_item: PurchaseOrderItem, quantity: int, user) -> PurchaseOrderItem:
    """
    Receive `quantity` units for a PO line item.

    - Increments quantity_received on the item.
    - Calls inventory.adjust_stock (PO_RECEIPT) — creates the Stock row if absent.
    - Re-evaluates PO status: PARTIALLY_RECEIVED or COMPLETED.
    """
    po = po_item.order  # Access the parent PO for status checks and reference data
    
    if po.status not in (
        PurchaseOrder.OrderStatus.ISSUED,
        PurchaseOrder.OrderStatus.PARTIALLY_RECEIVED,
    ):
        raise InvalidOrderTransitionError(
            f'Cannot receive items on PO "{po.po_number}" with status '
            f'"{po.get_status_display()}". PO must be ISSUED or PARTIALLY RECEIVED.'
        )
    if not po_item.destination_location:
        raise InvalidOrderTransitionError(
            f'PO item (SKU: {po_item.product.sku}) has no destination shelf set. '
            'Set a destination_location on the item before receiving.'
        )
        
    with transaction.atomic():
        po_item.quantity_received += quantity   # Increment the received quantity on the PO item
        po_item.save(update_fields=['quantity_received', 'updated_at']) # Save the updated PO item

        adjust_stock(
            product=po_item.product,
            location=po_item.destination_location,
            delta=quantity,
            movement_type=StockMovement.MovementType.PO_RECEIPT,
            user=user,
            reference_id=po.po_number,
            reason=f'Received {quantity} × {po_item.product.sku} on {po.po_number}',
        )   # Adjust stock based on the received quantity; creates Stock record if it doesn't exist

        all_items = list(po.items.all()) # Fetch all items to check if the entire PO is now fully received
        
        if all(item.is_fully_received for item in all_items):
            po.status = PurchaseOrder.OrderStatus.COMPLETED
            po.received_at = timezone.now()
            logger.info('PO %s fully received — marked COMPLETED.', po.po_number)
        else:
            po.status = PurchaseOrder.OrderStatus.PARTIALLY_RECEIVED

        po.updated_by = user    # Update the PO's updated_by field to the current user
        
        po.save(update_fields=['status', 'received_at', 'updated_by', 'updated_at'])    # Save the updated PO status and timestamps

    return po_item



def cancel_purchase_order(po: PurchaseOrder, user) -> PurchaseOrder:
    """Cancel a PO. Cannot cancel an already COMPLETED order."""
    if po.status == PurchaseOrder.OrderStatus.COMPLETED:
        raise InvalidOrderTransitionError(
            f'Cannot cancel PO "{po.po_number}" — it is already COMPLETED.'
        )
        
    if po.status == PurchaseOrder.OrderStatus.CANCELLED:
        raise InvalidOrderTransitionError(f'PO "{po.po_number}" is already cancelled.')
    
    if po.status == PurchaseOrder.OrderStatus.PARTIALLY_RECEIVED:
        raise InvalidOrderTransitionError(
            f'Cannot cancel PO "{po.po_number}" — it is partially received. '
            'Manually adjust stock to correct any received items, then cancel the PO once the stock is accurate.'
        )

    with transaction.atomic():
        po.status = PurchaseOrder.OrderStatus.CANCELLED
        po.updated_by = user
        po.save(update_fields=['status', 'updated_by', 'updated_at'])    # Save the updated PO status and timestamps
        
    logger.info('PO %s cancelled by %s.', po.po_number, user.email)
    
    return po


# ---------------------------------------------------------------------------
# Work Order services
# ---------------------------------------------------------------------------

def issue_work_order(wo: WorkOrder, user) -> WorkOrder:
    """
    Transition: DRAFT → ISSUED (or PENDING_INSUFFICIENT_STOCK if any item is short).
    Stock is not deducted here — deduction happens on complete_work_order.
    """
    if wo.status != WorkOrder.WorkOrderStatus.DRAFT:
        raise InvalidOrderTransitionError(
            f'Cannot issue WO "{wo.wo_number}" with status "{wo.get_status_display()}". '
            'Only DRAFT work orders may be issued.'
        )
        
    if not wo.items.exists():
        raise InvalidOrderTransitionError(
            f'Cannot issue WO "{wo.wo_number}" — it has no line items.'
        )   

    insufficient = []
    
    for item in wo.items.select_related('product', 'source_location').all():
        stock = Stock.objects.filter(
            product=item.product, location=item.source_location
        ).first()   # Check current stock for the product at the source location
        
        if not stock or stock.quantity < item.quantity_required:
            insufficient.append(item.product.sku)   # Track SKUs that are insufficient for this work order item

    with transaction.atomic():
        if insufficient:
            wo.status = WorkOrder.WorkOrderStatus.PENDING_INSUFFICIENT_STOCK
            
            logger.warning(
                'WO %s issued with insufficient stock for SKU(s): %s',
                wo.wo_number, ', '.join(insufficient),
            )
        else:
            wo.status = WorkOrder.WorkOrderStatus.ISSUED
            logger.info('WO %s issued by %s.', wo.wo_number, user.email)
            
        wo.updated_by = user    # Update the WO's updated_by field to the current user
        wo.save(update_fields=['status', 'updated_by', 'updated_at'])   # Save the updated WO status and timestamps

    return wo   # Return the updated work order instance with the new status



def complete_work_order(
    wo: WorkOrder,
    completion_status: str,
    user,
    notes: str = '',
) -> WorkOrder:
    """
    Deduct stock for all items (unless COMPLETED_NOT_USED) and close the WO.

    Deducts min(quantity_required, available_stock) per item so the call
    never raises InsufficientStockError — partial issue is reflected in
    the item's quantity_issued.
    """
    issuable = {
        WorkOrder.WorkOrderStatus.ISSUED,
        WorkOrder.WorkOrderStatus.PENDING_INSUFFICIENT_STOCK,
    } # Only these statuses can transition to a completed state; DRAFT work orders cannot be completed, and already completed/cancelled work orders cannot be re-completed.
    
    if wo.status not in issuable:
        raise InvalidOrderTransitionError(
            f'Cannot complete WO "{wo.wo_number}" with status "{wo.get_status_display()}". '
            'WO must be ISSUED or PENDING_INSUFFICIENT_STOCK.'
        )

    with transaction.atomic():
        if completion_status != WorkOrder.WorkOrderStatus.COMPLETED_NOT_USED:           

            for item in wo.items.select_related('product', 'source_location').all():
                stock = Stock.objects.select_for_update().filter(
                    product=item.product, location=item.source_location
                ).first()   # Check current stock for the product at the source location to determine how much can be issued against this item. We allow partial issuance, so we take the min of quantity_required and available stock.
                
                qty_to_issue = min(item.quantity_required, stock.quantity) if stock else 0  # Determine how many units can be issued based on current stock; if no stock record exists, treat as zero available.

                if qty_to_issue > 0:
                    adjust_stock(
                        product=item.product,
                        location=item.source_location,
                        delta=-qty_to_issue,
                        movement_type=StockMovement.MovementType.WO_ISSUE,
                        user=user,
                        reference_id=wo.wo_number,
                        reason=notes or f'Issued for {wo.wo_number}',
                    )   # Deduct the issued quantity from stock; creates a StockMovement record for this issuance. We pass the notes as the reason for the stock movement, or a default reason if no notes are provided.
                    
                    item.quantity_issued = qty_to_issue # Update the item with the quantity that was actually issued based on available stock. This allows us to reflect partial issuance if stock was insufficient.
                    
                    item.save(update_fields=['quantity_issued', 'updated_at']) # Save the updated item with the quantity issued and timestamp.

        if notes:
            wo.notes = f'{wo.notes}\n{notes}'.strip() if wo.notes else notes # Append the new notes to existing notes if they exist, or set as the notes if there are no existing notes.

        wo.status = completion_status
        wo.completed_at = timezone.now()
        wo.updated_by = user
        
        wo.save(update_fields=['status', 'completed_at', 'notes', 'updated_by', 'updated_at'])  # Save the updated WO status, completion timestamp, notes, and updated_by user.

    logger.info('WO %s completed as "%s" by %s.', wo.wo_number, completion_status, user.email)
    
    return wo


def cancel_work_order(wo: WorkOrder, user) -> WorkOrder:
    """Cancel a WO. Raises if already in a terminal state."""
    if wo.is_terminal:
        raise InvalidOrderTransitionError(
            f'Cannot cancel WO "{wo.wo_number}" — it is already in a terminal state '
            f'("{wo.get_status_display()}").'
        )
        
    with transaction.atomic():
        wo.status = WorkOrder.WorkOrderStatus.CANCELLED
        wo.updated_by = user
        
        wo.save(update_fields=['status', 'updated_by', 'updated_at'])   # Save the updated WO status and timestamps
        
    logger.info('WO %s cancelled by %s.', wo.wo_number, user.email)
    
    return wo