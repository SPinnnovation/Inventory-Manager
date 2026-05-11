from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Grants access only to users with the Admin Role
    """
    def has_permission(self, request, view):
        return bool (
            request.user 
            and request.user.is_authenticated 
            and request.user.role == "admin"        
        )
        
        
class IsAdminOrFloorManager(BasePermission):
    """Grants access to Admins and Floor Managers (order-approval roles)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "floor_manager")
        )


class IsAdminOrSelf(BasePermission):
    """
    Grants list/create to Admins only.
    Grants retrieve/update/delete to Admins or the object's owner.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        # obj may be a User instance or a Profile instance.
        target_user = obj if hasattr(obj, "email") else getattr(obj, "user", None)
        return target_user == request.user