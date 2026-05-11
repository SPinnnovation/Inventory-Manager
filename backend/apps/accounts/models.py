from django.contrib.auth.models import AbstractUser
from django.db import models


from .managers import UserManager


class User(AbstractUser):
    """
    Custom User model that extends the default Django AbstractUser.
    """
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        FLOOR_MANAGER = 'floor_manager', 'Floor Manager'
        STAFF = 'staff', 'Staff'
        VIEWER = 'viewer', 'Viewer'
        
    username = None  # Remove the username field
    email = models.EmailField(unique=True, db_index=True) # Use email as the unique identifier
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        db_index=True,
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
        return self.role in (self.Role.ADMIN, self.Role.FLOOR_MANAGER)  # Only Admins and Floor Managers can approve orders
    
    
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