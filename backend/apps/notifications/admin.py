from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'notification_type', 'is_read', 'title', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['user__email', 'message', 'title']
    readonly_fields = ['user', 'title', 'message', 'notification_type', 'created_at']
    ordering = ['-created_at']
