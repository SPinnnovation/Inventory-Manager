import logging
from celery import shared_task
from django.utils import timezone

from .models import PurchaseOrder, WorkOrder

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)  
def notify_po_status_change(self, po_id: int) -> None:
    """Log (and later email) when a PO status changes."""
    try:
        po = PurchaseOrder.objects.select_related('created_by').get(pk=po_id)
        logger.info(
            'PO status changed | po_number=%s new_status=%s by=%s',
            po.po_number, po.get_status_display(), po.created_by.email
        )
        # TODO: Implement email notifications to stakeholders about the PO status change.
    except PurchaseOrder.DoesNotExist:
        logger.error('PO with id %s does not exist for status change notification.', po_id)
    except Exception as exc:
        logger.error('Error in notify_po_status_change task for PO id %s: %s', po_id, exc)
        self.retry(exc=exc) # Retry the task in case of transient errors (e.g., database issues, email service downtime)
        
        
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_wo_status_change(self, wo_id: int) -> None:
    """Log (and later email/notify assigned_to) when a WO status changes."""
    try:
        wo = WorkOrder.objects.select_related('created_by').get(pk=wo_id)
        logger.info(
            'WO status changed | wo_number=%s new_status=%s by=%s',
            wo.wo_number, wo.get_status_display(), wo.created_by.email
        )
        # TODO: Implement email notifications to the assigned user and stakeholders about the WO status change.
    except WorkOrder.DoesNotExist:
        logger.error('WO with id %s does not exist for status change notification.', wo_id)
    except Exception as exc:
        logger.error('Error in notify_wo_status_change task for WO id %s: %s', wo_id, exc)
        self.retry(exc=exc) # Retry the task in case of transient errors (e.g., database issues, email service downtime)
        
        
@shared_task
def flag_overdue_orders() -> None:
    """
    Periodic task — identify and log overdue POs and WOs.
    Schedule via Celery Beat (e.g. daily at midnight).
    """
    today = timezone.now().date()
    
    open_po_statuses = (
        PurchaseOrder.OrderStatus.DRAFT,
        PurchaseOrder.OrderStatus.ISSUED,
        PurchaseOrder.OrderStatus.PARTIALLY_RECEIVED,    
    ) # Only these statuses are considered open and can be overdue; completed and cancelled POs are not overdue.
    
    overdue_pos = list(
        PurchaseOrder.objects.filter(
            expected_delivery_date__lt=today,
            status__in=open_po_statuses,
        ).values_list('po_number', flat=True)    
    )   # Query for POs that have an expected delivery date in the past and are still in an open status, and get their PO numbers as a list.    
    
    if overdue_pos:
        logger.warning('Overdue Purchase Orders (%d): %s', len(overdue_pos), ', '.join(overdue_pos))

    terminal_wo = (
        WorkOrder.WorkOrderStatus.COMPLETED_FULLY_USED,
        WorkOrder.WorkOrderStatus.COMPLETED_PARTIALLY_USED,
        WorkOrder.WorkOrderStatus.COMPLETED_NOT_USED,
        WorkOrder.WorkOrderStatus.CANCELLED,
    )   # These WO statuses are considered terminal and cannot be overdue; only WOs that are not in these statuses can be overdue.
    
    overdue_wos = list(
        WorkOrder.objects.filter(due_date__lt=today)
        .exclude(status__in=terminal_wo)
        .values_list('wo_number', flat=True)
    ) # Query for WOs that have a due date in the past and are not in a terminal status, and get their WO numbers as a list.
    
    if overdue_wos:
        logger.warning('Overdue Work Orders (%d): %s', len(overdue_wos), ', '.join(overdue_wos))