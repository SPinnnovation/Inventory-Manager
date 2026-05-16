import logging
from datetime import timedelta

from celery import shared_task
from django.core.cache import cache
from django.db.models import Sum
from django.utils import timezone

logger = logging.getLogger(__name__)

_SUMMARY_CACHE_KEY = 'analytics:dashboard:summary'
_BURN_RATES_CACHE_KEY = 'analytics:burn_rates'
_BURN_RATES_TTL = 3600  # 1 hour


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def warm_dashboard_cache(self):
    """
    Deletes the dashboard summary cache key so the next HTTP request
    to GET /analytics/dashboard/summary/ forces a fresh DB computation.
    Scheduled every 5 minutes via CELERY_BEAT_SCHEDULE.
    """
    try:
        cache.delete(_SUMMARY_CACHE_KEY)
        logger.info('warm_dashboard_cache: cache key invalidated')
    except Exception as exc:
        logger.exception('warm_dashboard_cache: failed — %s', exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def compute_burn_rates(self):
    """
    Aggregates WO_ISSUE stock movements over the trailing 30 days,
    grouped by product, to estimate daily consumption and remaining
    stock life.  Stores the top 20 most-critical products (shortest
    days_remaining first) to the 'analytics:burn_rates' Redis cache
    with a 1-hour TTL.

    Scheduled every hour via CELERY_BEAT_SCHEDULE.
    """
    from apps.inventory.models import Stock, StockMovement  # local import avoids circular deps at module load

    try:
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # Sum of quantity_changed per product for WO_ISSUE movements.
        # WO_ISSUE movements are stored as negative integers.
        burn_rows = (
            StockMovement.objects
            .filter(
                movement_type=StockMovement.MovementType.WO_ISSUE,
                timestamp__gte=thirty_days_ago,
            )
            .values('stock__product_id', 'stock__product__name', 'stock__product__sku')
            .annotate(total_consumed=Sum('quantity_changed'))
        )

        results = []
        for row in burn_rows:
            product_id = row['stock__product_id']
            # total_consumed is negative (WO_ISSUE), abs() gives units consumed
            consumed = abs(row['total_consumed'] or 0)
            if consumed == 0:
                continue

            daily_burn = consumed / 30.0

            total_stock = (
                Stock.objects
                .filter(product_id=product_id)
                .aggregate(total=Sum('quantity'))['total']
            ) or 0

            days_remaining = round(total_stock / daily_burn) if daily_burn > 0 else None

            results.append({
                'product_id': product_id,
                'name': row['stock__product__name'],
                'sku': row['stock__product__sku'],
                'daily_burn_rate': round(daily_burn, 2),
                'total_stock': total_stock,
                'estimated_days_remaining': days_remaining,
            })

        # Most critical first (None / unknown sorted last)
        results.sort(
            key=lambda x: (
                x['estimated_days_remaining'] is None,
                x['estimated_days_remaining'] if x['estimated_days_remaining'] is not None else 0,
            )
        )

        cache.set(_BURN_RATES_CACHE_KEY, results[:20], _BURN_RATES_TTL)
        logger.info('compute_burn_rates: stored %d products', len(results))
        return len(results)

    except Exception as exc:
        logger.exception('compute_burn_rates: failed — %s', exc)
        raise self.retry(exc=exc)
