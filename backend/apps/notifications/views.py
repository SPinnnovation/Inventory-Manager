from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .filters import NotificationFilter
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    """
    GET    /api/v1/notifications/          — list notifications for current user
    GET    /api/v1/notifications/{id}/     — retrieve single notification
    PATCH  /api/v1/notifications/{id}/     — mark as read (is_read field only)
    POST   /api/v1/notifications/mark-all-read/  — mark all as read
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = NotificationFilter
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    # Disallow PUT — only partial updates (PATCH) make sense here
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated}, status=status.HTTP_200_OK)
