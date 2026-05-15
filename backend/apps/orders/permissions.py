from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.accounts.models import User

class IsAdminOrFloorManagerOrReadOnly(BasePermission):
    """Read: any authenticated user. Write: admin or floor_manager."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (User.Role.ADMIN, User.Role.FLOOR_MANAGER)


class IsAdminOrFloorManagerOrStaff(BasePermission):
    """Operational actions (issue/complete/cancel). Viewers are read-only."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.ADMIN, User.Role.FLOOR_MANAGER, User.Role.STAFF)
        )