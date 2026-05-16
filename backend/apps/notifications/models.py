from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    Persistent notification record per user.

    notification_type values are lowercase (warning / info / success / error)
    so they map directly onto the frontend NotificationContext notify[type]()
    API without any client-side transformation.
    """

    class Type(models.TextChoices):
        WARNING = 'warning', 'Warning'
        INFO = 'info', 'Info'
        SUCCESS = 'success', 'Success'
        ERROR = 'error', 'Error'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    title = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=10,
        choices=Type.choices,
        default=Type.INFO,
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read'], name='notif_user_read_idx'),
        ]

    def __str__(self):
        return f'[{self.notification_type}] {self.user_id} — {self.message[:60]}'
