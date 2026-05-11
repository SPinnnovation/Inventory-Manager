import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, Profile

logger = logging.getLogger(__name__) # Logger for this module

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a Profile record when a new User is saved."""
    if created:
        Profile.objects.create(user=instance) # Create a Profile linked to the new User
        logger.debug(f'Created profile for new user: {instance.email}') # Log the creation of the profile