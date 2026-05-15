from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'orders'

router = DefaultRouter()

router = DefaultRouter()
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'purchase-order-items', views.PurchaseOrderItemViewSet,  basename='purchaseorderitem')
router.register(r'work-orders', views.WorkOrderViewSet, basename='workorder')
router.register(r'work-order-items', views.WorkOrderItemViewSet, basename='workorderitem')

urlpatterns = router.urls