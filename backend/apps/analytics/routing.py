from django.urls import path
from .consumers import ActivityFeedConsumer

websocket_urlpatterns = [
    path('ws/analytics/activity/', ActivityFeedConsumer.as_asgi()),
]
