import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class ActivityFeedConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer that streams live inventory activity events to
    authenticated browser clients.

    Connect:  ws://<host>/ws/analytics/activity/
    Group:    inventory.activity
    Events:   type='activity.event' — pushed by apps.analytics.signals
              whenever a StockMovement is created.
    """

    GROUP_NAME = 'inventory.activity'

    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        logger.debug('ActivityFeedConsumer: %s connected', user.email)

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    # Called when the channel group receives type='activity.event'
    async def activity_event(self, event):
        await self.send_json(event['payload'])
