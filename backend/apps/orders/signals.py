import logging
from django.db.models.signals import pre_save
from django.db import transaction
from django.dispatch import receiver
from django.utils.timezone import now

from .models import PurchaseOrder, WorkOrder

logger = logging.getLogger(__name__) # Logger for this module


def _generate_number(model_cls, field_name: str, prefix: str) -> str:
    """
    Thread-safe sequential number generator.
    Format: {PREFIX}-{YEAR}-{SEQ:05d}  →  PO-2026-00001
    Uses select_for_update() inside an atomic block to prevent duplicates
    under concurrent requests.
    """
    year = now().year
    like_prefix = f"{prefix}-{year}-"
    
    with transaction.atomic():
        last = (
            model_cls.objects
            .filter(**{f"{field_name}__startswith": like_prefix})
            .select_for_update()
            .order_by(f"-{field_name}")
            .values_list(field_name, flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.rsplit('-', 1)[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
    
    return f"{prefix}-{year:04d}-{seq:05d}"


@receiver(pre_save, sender=PurchaseOrder)
def auto_po_number(sender, instance, **kwargs):
    """
    Automatically generates a sequential Purchase Order (PO) number
    before saving a PurchaseOrder instance.    
    """
    if not instance.po_number:
        instance.po_number = _generate_number(PurchaseOrder, 'po_number', 'PO')
        logger.debug("Auto-generated PO number: %s", instance.po_number)


@receiver(pre_save, sender=WorkOrder)
def auto_wo_number(sender, instance, **kwargs):
    """
    Automatically generates a sequential Work Order (WO) number
    before saving a WorkOrder instance.
    """
    if not instance.wo_number:
        instance.wo_number = _generate_number(WorkOrder, 'wo_number', 'WO')
        logger.debug("Auto-generated WO number: %s", instance.wo_number)