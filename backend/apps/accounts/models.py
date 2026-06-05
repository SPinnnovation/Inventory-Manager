from django.contrib.auth.models import AbstractUser
from django.db import models


from .managers import UserManager


class User(AbstractUser):
    """
    Custom User model that extends the default Django AbstractUser.
    """
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        TEAM_LEAD = "team_lead", "Team Lead"
        TEAM_MEMBER = "team_member", "Team Member"
        HR_SPECIALIST = "hr_specialist", "HR Specialist"
        STAFF = "staff", "Staff"
        VIEWER = "viewer", "Viewer"

    class AccountStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        INVITED = "invited", "Invited"
        SUSPENDED = "suspended", "Suspended"
        DEACTIVATED = "deactivated", "Deactivated"
        
    username = None  # Remove the username field
    email = models.EmailField(unique=True, db_index=True) # Use email as the unique identifier
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        db_index=True,
    )
    organization = models.ForeignKey(
        "organization.Organization" ,
        on_delete=models.PROTECT,
        related_name='users',
        null=True,
        blank=True,
        db_index=True,
    )
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE,
        db_index=True,
    )
    must_change_password = models.BooleanField(default=False)
    credentials_sent_at = models.DateTimeField(null=True, blank=True)
    credentials_sent_by = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="credential_user_created",
        null=True,
        blank=True,       
    )

    
    USERNAME_FIELD = 'email'  # Set email as the unique identifier for authentication
    REQUIRED_FIELDS = ['first_name', 'last_name']  # Fields required when creating a superuser
    
    objects = UserManager()  # Use the custom user manager
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']
        
    def __str__(self):
        return self.email
    
    @property
    def full_name(self):
        return self.get_full_name() # Returns the full name of the user (first name + last name)
    
    @property
    def can_approve_orders(self):
        """True for roles permitted to approve POs and WOs."""
        return self.role in (self.Role.ADMIN, self.Role.MANAGER)  # Only Admins and Floor Managers can approve orders
    
    
class Profile(models.Model):
    """
    Extended profile information for a User.
    Created automatically via post_save signal when a User is created.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Profile'
        verbose_name_plural = 'Profiles'
        ordering = ['user__email']
        db_table = 'accounts_profiles'  # Custom database table name
        
    def __str__(self):
        return f"Profile of {self.user.email}"