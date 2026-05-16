import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.inventory.models import StockMovement

logger = logging.getLogger(__name__)

_SUMMARY_CACHE_KEY = 'analytics:dashboard:summary'
_WS_GROUP = 'inventory.activity'


@receiver(post_save, sender=StockMovement)
def on_stock_movement_created(sender, instance, created, **kwargs):
    """
    Fires after every StockMovement save.  On creation:
      1. Invalidates the dashboard summary Redis cache so the next
         GET /analytics/dashboard/summary/ reflects the new state.
      2. Pushes a lightweight activity event to the 'inventory.activity'
         WebSocket group so connected dashboards update in real time.

    The entire handler is wrapped in a broad try/except so that a Redis
    or channel-layer failure can never roll back the calling DB transaction.
    """
    if not created:
        return

    try:
        # 1 ── Invalidate summary cache
        cache.delete(_SUMMARY_CACHE_KEY)

        # 2 ── Build WS payload (lazy FK access — acceptable on write path)
        payload = {
            'type': 'movement',
            'product_name': instance.stock.product.name,
            'product_sku': instance.stock.product.sku,
            'location': str(instance.stock.location),
            'quantity_changed': instance.quantity_changed,
            'movement_type': instance.movement_type,
            'reference_id': instance.reference_id or '',
            'user_email': instance.user.email,
            'timestamp': instance.timestamp.isoformat(),
        }

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            _WS_GROUP,
            {'type': 'activity.event', 'payload': payload},
        )
    except Exception:
        logger.exception(
            'analytics.signals: failed to process post_save for StockMovement pk=%s',
            instance.pk,
        )
