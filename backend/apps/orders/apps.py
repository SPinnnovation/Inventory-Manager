from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.orders'
    verbose_name = 'Orders'
    
    def ready(self):
        # Import signal handlers to ensure they are registered
        import apps.orders.signals