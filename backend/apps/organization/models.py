from django.conf import settings
from django.core.exceptions import ValidationError
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
        ordering = ("-created_at")



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

    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=60, unique=True, db_index=True)
    department_type = models.CharField(max_length=40, choices=DepartmentType.choices, default=DepartmentType.ADMINISTRATION)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ("name")
        indexes = [
            models.Index(fields=["code",]),
            models.Index(fields=["department_type",]),
        ] # Indexing for better performance on filtering and sorting        

    def __str__(self):
        return self.name


class Position(TimeStampedModel):
    """
    Model representing a position in the organization.
    """
    class Level(models.IntegerChoices):
        ADMIN = 100, "Admin"
        MANAGER = 70, "Manager"
        TEAM_LEAD = 40, "Team Lead"
        TEAM_MEMBER = 10, "Team Member"
        HR_SPECIALIST = 60, "HR Specialist"

    name = models.CharField(max_length=255)
    code = models.SlugField(max_length=60, unique=True, db_index=True)
    level = models.IntegerField(choices=Level.choices, default=Level.TEAM_MEMBER, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Position"
        verbose_name_plural = "Positions"
        ordering = ("-level", "name")
        indexes = [
            models.Index(fields=["code",]),
            models.Index(fields=["level",]),
        ] # Indexing for better performance on filtering and sorting

    def __str__(self):
        return self.name