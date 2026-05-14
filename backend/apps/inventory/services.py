import logging
from django.db import transaction

from .models import Stock, StockMovement

logger = logging.getLogger(__name__) # Logger for this module


class InsufficientStockError(Exception):
    """Raised when an adjustment would drive quantity below zero."""


class OptimisticLockError(Exception):
    """Raised when a client's expected version no longer matches the DB row."""


def adjust_stock(
    *,
    product,
    location,
    delta,
    movement_type,
    user,
    reference_id='',
    reason='',
    expected_version=None,
):
    """
    Atomically adjust stock at a location and record an immutable StockMovement.

    Args:
        product (Product): Product being adjusted.
        location (Shelf): Physical shelf location.
        delta (int): Positive = add, negative = remove.
        movement_type (str): StockMovement.MovementType choice.
        user (User): User performing the action.
        reference_id (str): Optional PO/WO reference (e.g. 'PO-1029').
        reason (str): Optional free-text reason.
        expected_version (int|None): If supplied, raises OptimisticLockError on version mismatch.

    Returns:
        tuple[Stock, StockMovement]

    Raises:
        InsufficientStockError: Removal would result in negative quantity.
        OptimisticLockError: Version mismatch (concurrent modification).
    """
    with transaction.atomic():
        # Ensure a Stock row exists before acquiring the row-level lock
        Stock.objects.get_or_create(
            product=product,
            location=location,
            defaults={'quantity': 0, 'version': 1},
        )

        # Exclusive row lock — blocks concurrent transactions on the same row
        stock = Stock.objects.select_for_update().get(product=product, location=location)

        if expected_version is not None and stock.version != expected_version:
            raise OptimisticLockError(
                f'Concurrent modification detected. '
                f'Expected version {expected_version}, found {stock.version}. '
                f'Please refresh and try again.'
            )

        new_qty = stock.quantity + delta
        if new_qty < 0:
            raise InsufficientStockError(
                f"Insufficient stock for '{product.name}' (SKU: {product.sku}) "
                f"at {location}. Available: {stock.quantity} {product.unit_of_measure}, "
                f"requested change: {delta}."
            )

        stock.quantity = new_qty
        stock.version += 1
        stock.save(update_fields=['quantity', 'version', 'updated_at'])

        movement = StockMovement.objects.create(
            stock=stock,
            quantity_changed=delta,
            movement_type=movement_type,
            reference_id=reference_id or '',
            user=user,
            reason=reason or '',
        )

    logger.info(
        'Stock adjusted | product=%s location=%s delta=%s type=%s by=%s ref=%s',
        product.sku, location, delta, movement_type, user.email, reference_id,
    )

    # Trigger async low-stock check after the transaction commits
    from .tasks import check_low_stock  # avoid circular import at module level
    try:
        check_low_stock.delay(product.pk)
    except Exception:
        logger.warning(
            'check_low_stock task could not be enqueued for product %s — broker unavailable?',
            product.pk,
        )

    return stock, movement