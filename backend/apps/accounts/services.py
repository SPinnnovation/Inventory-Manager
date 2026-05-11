import logging
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers as drf_serializers

from .models import User
from .tasks import send_password_change_notification, send_welcome_email

logger = logging.getLogger(__name__)


def authenticate_user(request, email: str, password: str) -> User:
    """
    Authenticate a user with email and password.
    django-axes tracks and locks out repeat failures automatically via middleware.

    Returns the authenticated User on success.
    Raises DRF ValidationError on failure.
    """
    user = authenticate(request, username=email, password=password) # Authenticate the user using Django's built-in authentication system
    
    if user is None:
        raise drf_serializers.ValidationError(
            {"non_field_errors": ["Invalid email or password."]}
        )
    if not user.is_active:
        raise drf_serializers.ValidationError(
            {"non_field_errors": ["This account has been deactivated."]}
        )
        
    login(request, user)    # Log the user in by creating a session
    
    logger.info("User %s logged in.", user.email)   # Log the successful login
    
    return user # Return the authenticated user object


def logout_user(request) -> None:
    """
    Log out the current user by clearing their session. Flushes the session data and logs the logout event.
    """
    email = getattr(request.user, 'email', 'anonymous user') # Get the email of the user for logging, or 'anonymous user' if not available
    logout(request)   # Log the user out by clearing the session data
    logger.info("User %s logged out.", email)  # Log the logout event
    
    
def create_user(validated_data: dict, created_by: User | None = None) -> User:
    """
    Create a new User from validated serializer data.
    The Profile record is created automatically by the post_save signal.
    Triggers a welcome email task after creation.
    """
    user = User.objects.create_user(**validated_data)   # Create the user using the custom user manager's create_user method, which handles password hashing and other logic
    
    logger.info(
        "User %s created by %s.",
        user.email,
        getattr(created_by, "email", "system"),
    )
    
    send_welcome_email.delay(user.id)   # Trigger the asynchronous task to send a welcome email to the new user
    
    return user


def change_password(request, user: User, old_password: str, new_password: str) -> None:
    """
    Change a user's password.
    - Validates the old password matches.
    - Validates the new password against Django's AUTH_PASSWORD_VALIDATORS.
    - Calls update_session_auth_hash so the session remains valid after change.
    - Triggers a notification task.
    """
    if not user.check_password(old_password):   # Verify that the old password is correct
        raise drf_serializers.ValidationError(
            {"old_password": "Incorrect current password."}
        )
    try:
        validate_password(new_password, user)   # Validate the new password using Django's built-in password validators, passing the user for context (e.g., to prevent common passwords or passwords similar to user attributes)
    except DjangoValidationError as exc:
        raise drf_serializers.ValidationError({"new_password": exc.messages})

    user.set_password(new_password) # Set the new password, which handles hashing and salting
    user.save(update_fields=["password"])
    update_session_auth_hash(request, user)   # Update the session with the new password hash to keep the user logged in
    
    logger.info("User %s changed their password.", user.email)
    
    send_password_change_notification.delay(user.id)    # Trigger the asynchronous task to send a password change notification email to the user