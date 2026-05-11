from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AuthViewset, UserViewset

router = DefaultRouter()
router.register(r'auth', AuthViewset, basename='auth')
router.register(r'users', UserViewset, basename='users')

urlpatterns = [
    path('', include(router.urls)),
]
