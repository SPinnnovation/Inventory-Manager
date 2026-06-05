from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    ``created`` and ``modified`` fields.
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True        
        ordering = ["-created_at"]



class Capability(TimeStampedModel):
    """
    Represents a capability that can be assigned to a user.
    """
    code = models.CharField(max_length=160, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=80, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Capability"
        verbose_name_plural = "Capabilities"
        ordering = ["module", "name"]        
    
    def __str__(self):
        return f"{self.module} : {self.name} : {self.code}"



class RoleTemplate(TimeStampedModel):
    """
    Represents a role template that can be assigned to a user.
    """
    organization = models.ForeignKey(
        "organization.Organization", 
        on_delete=models.PROTECT, 
        blank=True, null=True, 
        related_name="role_templates"
    )
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=100, db_index=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    capabilities = models.ManyToManyField(Capability, through="RoleTemplateCapability", related_name="role_templates")

    class Meta:
        verbose_name = "Role Template"
        verbose_name_plural = "Role Templates"
        ordering = ["organization", "name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "code"], name="unique_role_template_code_per_org"),
        ]

    def __str__(self):
        return f"{self.organization} : {self.name}" 



class RoleTemplateCapability(TimeStampedModel):
    """
    Model linking RoleTemplate and Capability.
    """
    role_template = models.ForeignKey(RoleTemplate, on_delete=models.CASCADE, related_name="template_capabilities")
    capability = models.ForeignKey(Capability, on_delete=models.PROTECT, related_name="template_links")

    class Meta:
        verbose_name = "Role Template Capability"
        verbose_name_plural = "Role Template Capabilities"
        constraints = [
            models.UniqueConstraint(fields=["role_template", "capability"], name="unique_capability_per_role_template"),
        ]


class CapabilityScope(TimeStampedModel):
    """
    Represents the scope of a capability.
    """
    class ScopeType(models.TextChoices):
        ORGANIZATION = "organization", "Organization"
        DEPARTMENT = "department", "Department"
        TEAM = "team", "Team"
        LOCATION = "location", "Location"
        OBJECT = "object", "Object"

    organization = models.ForeignKey("organization.Organization", on_delete=models.PROTECT, related_name="capability_scopes")
    scope_type = models.CharField(max_length=30, choices=ScopeType.choices, db_index=True)
    department = models.ForeignKey("organization.Department", on_delete=models.PROTECT, blank=True, null=True)
    team = models.ForeignKey("organization.Team", on_delete=models.PROTECT, blank=True, null=True)
    location = models.ForeignKey("inventory.Shelf", on_delete=models.PROTECT, blank=True, null=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, blank=True, null=True)
    object_id = models.PositiveBigIntegerField(blank=True, null=True)
    scoped_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        verbose_name = "Capability Scope"
        verbose_name_plural = "Capability Scopes"
        indexes = [
            models.Index(fields=["organization", "scope_type"]),
            models.Index(fields=["content_type", "object_id"]),
        ]



class UserCapabilityGrant(TimeStampedModel):
    """
    Model representing the actual granting of a capability to a user.
    """
    organization = models.ForeignKey("organization.Organization", on_delete=models.PROTECT, related_name="capability_grants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="capability_grants")
    capability = models.ForeignKey(Capability, on_delete=models.PROTECT, related_name="user_grants")
    scope = models.ForeignKey(CapabilityScope, on_delete=models.PROTECT, related_name="capability_grants")
    granted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issued_capability_grants")
    source_role_template = models.ForeignKey(RoleTemplate, on_delete=models.PROTECT, blank=True, null=True)
    starts_at = models.DateTimeField()
    expires_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    revoked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, blank=True, null=True, related_name="revoked_capability_grants")
    revoke_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = "User Capability Grant"
        verbose_name_plural = "User Capability Grants"
        indexes = [
            models.Index(fields=["organization", "user", "is_active"]),
            models.Index(fields=["organization", "capability", "is_active"]),
        ]


class PermissionDelegationAudit(models.Model):
    """
    Model representing the audit trail of permission delegation.
    """
    class Action(models.TextChoices):
        GRANTED = "granted", "Granted"
        REVOKED = "revoked", "Revoked"
        EXPIRED = "expired", "Expired"

    organization = models.ForeignKey("organization.Organization", on_delete=models.PROTECT, related_name="permission_audit_events")
    grant = models.ForeignKey(UserCapabilityGrant, on_delete=models.PROTECT, related_name="audit_events")
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="permission_audit_events")
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Permission Delegation Audit"
        verbose_name_plural = "Permission Delegation Audits"
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        """
        Override save to make the model append-only.
        """
        if self.pk is not None:
            raise PermissionError("PermissionDelegationAudit records are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Override delete to make the model append-only.
        """
        raise PermissionError("PermissionDelegationAudit records cannot be deleted.")