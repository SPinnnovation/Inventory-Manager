import logging
from celery import shared_task
from django.db.models import F, Sum

from .models import Product, Stock


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def check_low_stock(self, product_id):
    """
    After any stock movement, check whether total stock for the product
    has fallen at or below its reorder point and emit a warning.
    When the notifications app is built, this task will dispatch alerts.
    """    
    try:
        product = Product.objects.get(pk=product_id) # Retrieve the product by ID
        
        total = (
            Stock.objects.filter(product=product)
            .aggregate(total=Sum('quantity'))['total'] or 0
        )   # Calculate the total stock quantity for the product by summing the 'quantity' field across all Stock records related to the product. If there are no records, default to 0.
        
        if total <= product.reorder_point: # Check if the total stock quantity is less than or equal to the product's reorder point
            logger.warning(
                "Low stock alert for product %s (ID: %d): total quantity %.4f at or below reorder point %.4f.",
                product.name, product.id, total, product.reorder_point
            )   # Log a warning message indicating that the stock level for the product is low, including the product name, ID, total quantity, and reorder point
            try:
                from apps.notifications.services import notify_floor_managers
                notify_floor_managers(
                    f'Low stock: {product.name} (SKU: {product.sku}) — '
                    f'{total} units remaining (reorder point: {product.reorder_point}).',
                    'warning',
                    title='Low Stock Alert',
                )
            except Exception:
                logger.exception('Notification dispatch failed in check_low_stock for product %d', product_id)
            
    except Product.DoesNotExist:
        logger.error("Product with ID %d does not exist. Cannot check low stock.", product_id) # Log an error if the product with the given ID does not exist
        
    except Exception as exc:
        logger.error("check_low_stock failed for product %d: %s", product_id, exc) # Log any unexpected exceptions that occur during the execution of the task