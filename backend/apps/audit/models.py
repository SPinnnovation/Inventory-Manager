from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class AuditEvent(models.Model):
    """
    Model representing an audit event.
    """
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"

    organization = models.ForeignKey(
        "organization.Organization",
        on_delete=models.PROTECT, 
        blank=True, null=True, 
        related_name="audit_events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        blank=True, null=True, 
        related_name="audit_events"
    )
    action = models.CharField(max_length=160, db_index=True)
    source_app = models.CharField(max_length=80, db_index=True)
    severity = models.CharField(
        max_length=20, 
        choices=Severity.choices, 
        default=Severity.INFO, 
        db_index=True
    )
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.PROTECT, 
        blank=True, null=True
    )
    object_id = models.PositiveBigIntegerField(blank=True, null=True)
    entity = GenericForeignKey("content_type", "object_id")
    before = models.JSONField(blank=True, null=True)
    after = models.JSONField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    request_id = models.CharField(max_length=100, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Audit Event"
        verbose_name_plural = "Audit Events"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization", "timestamp"]),
            models.Index(fields=["source_app", "action"]),
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["actor", "timestamp"]),
        ]

    def save(self, *args, **kwargs):
        """
        Prevent modification of existing AuditEvent records.
        """
        if self.pk is not None:
            raise PermissionError("AuditEvent records are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Prevent deletion of AuditEvent records.
        """
        raise PermissionError("AuditEvent records cannot be deleted.")


class StateTransitionLog(models.Model):
    """
    Model representing a state transition log.
    """
    organization = models.ForeignKey(
        "organization.Organization", on_delete=models.PROTECT, 
        blank=True, null=True, 
        related_name="state_transition_logs"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, 
        blank=True, null=True
    )
    source_app = models.CharField(max_length=80, db_index=True)
    entity_name = models.CharField(max_length=120, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True)
    from_state = models.CharField(max_length=120, blank=True)
    to_state = models.CharField(max_length=120, db_index=True)
    reason = models.TextField(blank=True)
    metadata = models.JSONField(blank=True, null=True)
    request_id = models.CharField(max_length=100, blank=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "State Transition Log"
        verbose_name_plural = "State Transition Logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization", "timestamp"]),
            models.Index(fields=["entity_name", "entity_id"]),
        ]

    def save(self, *args, **kwargs):
        """
        Prevent modification of existing StateTransitionLog records.
        """
        if self.pk is not None:
            raise PermissionError("StateTransitionLog records are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Prevent deletion of StateTransitionLog records.
        """
        raise PermissionError("StateTransitionLog records cannot be deleted.")


class OutboxEvent(models.Model):
    """
    Model representing an outbox event.
    """
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    organization = models.ForeignKey(
        "organization.Organization", 
        on_delete=models.PROTECT, 
        blank=True, null=True, 
        related_name="outbox_events"
    )
    event_type = models.CharField(max_length=160, db_index=True)
    aggregate_type = models.CharField(max_length=120, db_index=True)
    aggregate_id = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Outbox Event"
        verbose_name_plural = "Outbox Events"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["organization", "status", "created_at"]),
            models.Index(fields=["aggregate_type", "aggregate_id"]),
        ]