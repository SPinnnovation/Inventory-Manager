from django.utils import choices
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

def upload_organization_logo(instance, filename):
    return f"organization_logos/{instance.code}/{filename}"

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


class Organization(TimeStampedModel):
    """
    Model representing an organization.
    """
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=60, unique=True, db_index=True)
    legal_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)    
    logo = models.ImageField(upload_to=upload_organization_logo, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        ordering = ["name"]        

    def __str__(self):
        return self.name


class Department(TimeStampedModel):
    """
    Model representing a department in the organization.
    """
    class DepartmentType(models.TextChoices):
        ADMINISTRATION = "administration", "Administration"
        MANUFACTURING = "manufacturing", "Manufacturing"
        IT = "it", "IT"
        LOGISTICS = "logistics", "Logistics"
        STORAGE = "storage", "Storage"
        FINANCE = "finance", "Finance"
        MARKETING = "marketing", "Marketing"
        HR = "hr", "Human Resources"

    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="departments")    
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=60, unique=True, db_index=True)
    department_type = models.CharField(max_length=40, choices=DepartmentType.choices, default=DepartmentType.ADMINISTRATION)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["organization__name", "name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "code"], name="unique_department_code_per_org"),
        ]

    def __str__(self):
        return f"{self.organization.code} / {self.name}"


class Position(TimeStampedModel):
    """
    Model representing a position in the organization.
    """
    class Level(models.IntegerChoices):
        ADMIN = 100, "Admin"
        MANAGER = 70, "Manager"
        HR_SPECIALIST = 60, "HR Specialist"
        TEAM_LEAD = 40, "Team Lead"
        TEAM_MEMBER = 10, "Team Member"

    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="positions")
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=80, db_index=True)
    level = models.PositiveSmallIntegerField(choices=Level.choices, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Position"
        verbose_name_plural = "Positions"
        ordering = ["organization__name", "-level", "name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "code"], name="unique_position_code_per_org"),
        ]

    def __str__(self):
        return f"{self.organization.code} / {self.name}"


class Team(TimeStampedModel):
    """
    Model representing a team in the organization.
    """
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="teams")
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="teams")
    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=60, unique=True, db_index=True)
    purpose = models.TextField(blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_teams",
        null=True,
        blank=True
    )    
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        verbose_name = "Team"
        verbose_name_plural = "Teams"
        ordering = ["organization__name", "name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "code"], name="unique_team_code_per_org"),
        ]

    def __str__(self):
        return f"{self.organization.code} / {self.name}"



class TeamMembership(TimeStampedModel):
    class Role(models.TextChoices):
        MANAGER="manager", "Manager"
        TEAM_MEMBER="team_member", "Team Member"
        TEAM_LEAD = "team_lead", "Team Lead"

    class Status(models.TextChoices):
        ACTIVE="active", "Active"
        INACTIVE="inactive", "Inactive"
        SUSPENDED="suspended", "Suspended"

    organization = models.ForeignKey(
        Organization, 
        on_delete=models.PROTECT, 
        related_name="team_memberships"
    )
    team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="memberships")
    position = models.ForeignKey(Position, on_delete=models.PROTECT, related_name="team_memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TEAM_MEMBER, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    is_primary = models.BooleanField(default=False)
    starts_at = models.DateField()
    ends_at = models.DateField(blank=True, null=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True, 
        related_name="assigned_team_memberships"
    )

    class Meta:
        verbose_name = "Team Membership"
        verbose_name_plural = "Team Memberships"
        ordering = ["team__name", "user__email"]
        indexes = [
            models.Index(fields=["organization", "user", "status"]), # For filtering users by org and status
            models.Index(fields=["organization", "team", "role", "status"]), # For filtering memberships by org, team, role and status
        ]
        constraints = [
            models.UniqueConstraint(fields=["team", "user", "role"], name="unique_user_role_per_team"), # Ensures a user can only have one role per team
        ]   

    def clean(self):
        """
        Perform validation checks on the model instance.

        Raises:
            ValidationError: If any validation rule is violated.
        """
        if self.team.organization_id != self.organization_id:
            raise ValidationError("Team membership organization mismatch.")
        if self.ends_at and self.ends_at < self.starts_at:
            raise ValidationError("Membership end date cannot be before start date.")

    def __str__(self):
        return f"{self.user} -> {self.team} ({self.role})"
    


class TeamLeadAssignment(TimeStampedModel):
    """
    Model assigning Team Lead
    - A team can have multiple team leads over time
    - Team leads can be assigned to multiple teams
    - A team lead is a user who is assigned to a team as a team lead
    """
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="team_lead_assignments")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="lead_assignments")
    lead = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="team_lead_assignments")
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_lead_assignments")
    starts_at = models.DateField()
    ends_at = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Team Lead Assignment"
        verbose_name_plural = "Team Lead Assignments"
        indexes = [
            models.Index(fields=["organization", "lead", "is_active"]),
            models.Index(fields=["organization", "team", "is_active"]),
        ]

    def clean(self):
        """
        Perform validation checks on the model instance.

        Raises:
            ValidationError: If any validation rule is violated.
        """
        if self.team.organization_id != self.organization_id:
            raise ValidationError("Team lead assignment organization mismatch.")
        if self.ends_at and self.ends_at < self.starts_at:
            raise ValidationError("Lead assignment end date cannot be before start date.")



class ReportingLine(TimeStampedModel):
    """
    Model representing a reporting line in the organization.
    """
    class Scope(models.TextChoices):
        ORGANIZATION = "organization", "Organization"
        DEPARTMENT = "department", "Department"
        TEAM = "team", "Team"

    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name="reporting_lines")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reporting_lines_as_reporter")
    reports_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reporting_lines_as_superior")
    scope = models.CharField(max_length=30, choices=Scope.choices, db_index=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, blank=True, null=True, related_name="reporting_lines")
    team = models.ForeignKey(Team, on_delete=models.PROTECT, blank=True, null=True, related_name="reporting_lines")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Reporting Line"
        verbose_name_plural = "Reporting Lines"
        indexes = [
            models.Index(fields=["organization", "reporter", "is_active"]),
            models.Index(fields=["organization", "reports_to", "is_active"]),
        ]

    def clean(self):
        """
        Perform validation checks on the model instance.

        Raises:
            ValidationError: If any validation rule is violated.
        """
        if self.reporter_id == self.reports_to_id:
            raise ValidationError("A user cannot report to themselves.")
        if self.department and self.department.organization_id != self.organization_id:
            raise ValidationError("Reporting department organization mismatch.")
        if self.team and self.team.organization_id != self.organization_id:
            raise ValidationError("Reporting team organization mismatch.")