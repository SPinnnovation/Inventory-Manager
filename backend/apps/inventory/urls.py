from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'inventory'

urlpatterns = [
    # path('', views.index, name='index'),
]

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'warehouses', views.WarehouseViewSet, basename='warehouse')
router.register(r'floors', views.FloorViewSet, basename='floor')
router.register(r'racks', views.RackViewSet, basename='rack')
router.register(r'shelves', views.ShelfViewSet, basename='shelf')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'stock', views.StockViewSet, basename='stock')
router.register(r'movements', views.StockMovementViewSet, basename='movement')

urlpatterns = router.urls
