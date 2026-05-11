import logging
from celery import shared_task
from django.contrib.auth import get_user_model

User = get_user_model() # Get the User model, which may be a custom user model

logger = logging.getLogger(__name__)    # Logger for this module


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: int) -> None:
    """
    Send a welcome email to a newly created user.
    Retries up to 3 times on failure with a 60-second delay.
    """
    try:
        user = User.objects.get(id=user_id) # Retrieve the user by ID
        # Email sending logic will be implemented when templates are ready.
        
        logger.info("Welcome email queued for %s.", user.email) # Log that the email has been queued
        
    except User.DoesNotExist:
        logger.warning("send_welcome_email: User %s not found.", user_id)   # Log a warning if the user does not exist
    except Exception as exc:
        logger.error("send_welcome_email failed for user %s: %s", user_id, exc)
        raise self.retry(exc=exc)   # Retry the task if an exception occurs, with the exception passed to the retry mechanism
    

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_change_notification(self, user_id: int) -> None:
    """
    Notify a user that their password has been changed.
    Retries up to 3 times on failure with a 60-second delay.
    """
    try:
        user = User.objects.get(id=user_id) # Retrieve the user by ID
        # Email sending logic will be implemented when templates are ready.
        
        logger.info("Password-change notification queued for %s.", user.email) # Log that the email has been queued
        
    except User.DoesNotExist:
        logger.warning("send_password_changed_notification: User %s not found.", user_id)   # Log a warning if the user does not exist
    except Exception as exc:
        logger.error(
            "send_password_changed_notification failed for user %s: %s", user_id, exc
        )   # Log an error if the email sending fails
        
        raise self.retry(exc=exc)   # Retry the task if an exception occurs, with the exception passed to the retry mechanism