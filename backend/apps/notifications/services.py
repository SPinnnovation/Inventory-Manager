"""
Notification service layer.

Public API
----------
create_and_push(user, message, notification_type, title='')
    Create a Notification DB record for `user` and push to their personal
    WebSocket group immediately.

notify_floor_managers(message, notification_type, title='')
    Create Notification records for all active admin + floor_manager users
    and push to each user's personal WebSocket group.  Uses bulk_create so
    only one INSERT is issued regardless of the number of recipients.

Both functions are safe to call from inside a Django signal, a Celery task,
or an atomic transaction — failures in the WebSocket push are caught and
logged without re-raising so the caller's flow is never interrupted.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _push_to_group(group_name: str, payload: dict) -> None:
    """Send a channel-layer group_send without raising on failure."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name,
            {'type': 'notification.send', 'payload': payload},
        )
    except Exception:
        logger.exception('Failed to push notification payload to WS group %s', group_name)


def _build_payload(notification) -> dict:
    return {
        'id': notification.pk,
        'title': notification.title,
        'message': notification.message,
        'type': notification.notification_type,   # lowercase — maps to notify[type]()
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_and_push(user, message: str, notification_type: str, title: str = ''):
    """
    Persist a Notification for `user` and push the payload to their personal
    WebSocket group (user_<pk>).
    """
    from .models import Notification  # local import avoids circular at module load

    try:
        n = Notification.objects.create(
            user=user,
            message=message,
            notification_type=notification_type,
            title=title,
        )
        _push_to_group(f'user_{user.pk}', _build_payload(n))
        return n
    except Exception:
        logger.exception(
            'create_and_push failed for user %s (type=%s)', user.pk, notification_type
        )
        return None


def notify_floor_managers(message: str, notification_type: str, title: str = ''):
    """
    Persist Notification records for all active admin + floor_manager users and
    push to each user's personal WebSocket group.

    On PostgreSQL, bulk_create returns the created objects with PKs populated,
    allowing us to include the DB id in each WS payload.
    """
    from django.contrib.auth import get_user_model
    from .models import Notification

    try:
        User = get_user_model()
        managers = list(
            User.objects.filter(
                role__in=['admin', 'floor_manager'],
                is_active=True,
            )
        )
        if not managers:
            return []

        notifications = Notification.objects.bulk_create([
            Notification(
                user=u,
                message=message,
                notification_type=notification_type,
                title=title,
            )
            for u in managers
        ])

        for n, u in zip(notifications, managers):
            _push_to_group(f'user_{u.pk}', _build_payload(n))

        return notifications
    except Exception:
        logger.exception(
            'notify_floor_managers failed (type=%s, msg=%s)', notification_type, message[:80]
        )
        return []
