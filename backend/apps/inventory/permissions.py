from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.models import User

class IsAdminOrFloorManagerOrReadOnly(BasePermission):
    """
    Read access: any authenticated user.
    Write access: Admin or Floor Manager only.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.method in SAFE_METHODS:
            return True
        
        return request.user.role in (User.Role.ADMIN, User.Role.FLOOR_MANAGER)
    
    
class CanAdjustStock(BasePermission):
    """
    Admin, Floor Manager, and Staff may perform stock adjustments.
    Viewers are read-only.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.ADMIN, User.Role.FLOOR_MANAGER, User.Role.STAFF)
        )