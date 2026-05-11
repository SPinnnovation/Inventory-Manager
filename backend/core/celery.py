import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')  # Set the default Django settings module for the 'celery' program.

app = Celery('home_inventory')  # Create a new Celery application instance named 'home_inventory'

app.config_from_object('django.conf:settings', namespace='CELERY')  # Load Celery configuration from Django settings, using the 'CELERY_' prefix for relevant settings

app.autodiscover_tasks()  # Automatically discover tasks in installed apps by looking for a 'tasks.py' module in each app