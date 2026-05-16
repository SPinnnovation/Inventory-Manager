import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.accounts.models import User

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Personal WebSocket consumer that delivers real-time notifications to
    authenticated users.

    Connect:  ws://<host>/ws/notifications/
    Groups:
      user_<pk>          — personal group; every notification push targets this
      role_floor_manager — broadcast group joined by admin and floor_manager roles
                           (reserved for future bulk broadcasts; delivery today
                           uses personal groups only)
    Events:   type='notification.send' — pushed by apps.notifications.services
    """

    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.personal_group = f'user_{user.pk}'
        await self.channel_layer.group_add(self.personal_group, self.channel_name)

        # Join the role broadcast group for admin / floor_manager users
        self.role_group = None
        if user.role in (User.Role.ADMIN, User.Role.FLOOR_MANAGER):
            self.role_group = 'role_floor_manager'
            await self.channel_layer.group_add(self.role_group, self.channel_name)

        await self.accept()
        logger.debug('NotificationConsumer: %s connected (groups: %s)', user.email,
                     [self.personal_group] + ([self.role_group] if self.role_group else []))

    async def disconnect(self, code):
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        if getattr(self, 'role_group', None):
            await self.channel_layer.group_discard(self.role_group, self.channel_name)

    # Called when the channel group receives type='notification.send'
    async def notification_send(self, event):
        await self.send_json(event['payload'])
