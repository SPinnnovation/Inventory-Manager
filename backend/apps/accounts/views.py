import logging
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination

from .filters import UserFilter
from .models import User, Profile
from .permissions import IsAdmin, IsAdminOrSelf
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    ProfileSerializer,
    UserAdminUpdateSerializer,
    UserCreateSerializer,
    UserSelfUpdateSerializer,
    UserSerializer,
)
from .services import (
    authenticate_user,
    change_password,
    create_user,
    logout_user,
)


logger = logging.getLogger(__name__) # Logger for this module


class AuthViewset(viewsets.ViewSet):
    """
    Authentication endpoints: login, logout, current-user info, password change.
    These are stateless actions — no queryset or model binding.
    """
    @action(
        detail=False,
        methods=["post"],
        permisssion_classes=[AllowAny],
        url_path="login",
    )
    def login(self, request):
        """
        Authenticate with email and password and establish a session. Returns user details on success.
        """
        serializer = LoginSerializer(data=request.data) # Validate the input data using the LoginSerializer
        
        serializer.is_valid(raise_exception=True) # Raise a validation error if the input data is invalid
        
        user = authenticate_user(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],        
        )
        
        return Response(
            MeSerializer(user).data, # Serialize the authenticated user data using MeSerializer
            status=status.HTTP_200_OK,
        )
        
       
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="login",
    )
    def login(self, request):
        """Authenticate with email + password and establish a session."""
        serializer = LoginSerializer(data=request.data) # Validate the input data using the LoginSerializer
        serializer.is_valid(raise_exception=True)
        
        user = authenticate_user(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        ) # Authenticate the user using the authenticate_user service function
        
        return Response(MeSerializer(user).data, status=status.HTTP_200_OK) # Return the authenticated user data serialized with MeSerializer
    
    
    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="logout",
    )
    def logout(self, request):
        """Terminate the current session."""
        logout_user(request)    # Log out the user using the logout_user service function, which clears the session data and logs the event
        
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)  # Return a success message indicating the user has been logged out


    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="me",
    )
    def me(self, request):
        """Return the currently authenticated user's details."""
        return Response(MeSerializer(request.user).data, status=status.HTTP_200_OK) # Return the current authenticated user's data serialized with MeSerializer
       

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="change-password",
    )
    def change_password(self, request):
        """Change the current user's password without invalidating the session."""
        serializer = ChangePasswordSerializer(data=request.data) # Validate the input data using the ChangePasswordSerializer
        serializer.is_valid(raise_exception=True) # Raise a validation error if the input data is invalid
        
        change_password(
            request,
            request.user,
            serializer.validated_data["old_password"],
            serializer.validated_data["new_password"],
        )   # Change the user's password using the change_password service function, which checks the old password, sets the new password, and triggers a notification email
        
        return Response(
            {"detail": "Password changed successfully."}, status=status.HTTP_200_OK
        )   # Return a success message indicating the password has been changed successfully
        
        

class UserViewset(viewsets.ModelViewSet):
    """
    Admin-managed user CRUD.
    - list / create / destroy: Admin only.
    - retrieve / update: Admin (any user) or Self (own record).
    - destroy performs a soft-delete (deactivation) instead of hard deletion.
    """
    queryset = User.objects.select_related("profile").all().order_by("email") # Optimize queries by selecting related Profile objects
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrSelf] # Use custom permission to allow access to admins or the user themselves
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter] # Enable filtering, searching, and ordering
    filterset_class = UserFilter # Use custom filter class for filtering by role and active status
    pagination_class = StandardResultsSetPagination # Use custom pagination class for consistent pagination behavior across the API
    ordering_fields = ["email", "date_joined", "role"] # Allow ordering by email, date joined, or role
    search_fields = ["email", "first_name", "last_name"] # Allow searching by email, first name, or last name
    
    def get_permissions(self):
        if self.action in ("list", "create", "destroy"):
            return [IsAdmin()] # Only allow admins to list, create, or destroy users
        return [IsAdminOrSelf()] # Allow admins or the user themselves to retrieve or update user details
    
    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer # Use a different serializer for user creation to handle password write-only fields
        if self.action in ("update", "partial_update"):
            if self.request.user.role == "admin":
                return UserAdminUpdateSerializer # Admins can update all fields, including role and active status
            return UserSelfUpdateSerializer # Regular users can only update their own profile fields, not role or active status
        return UserSerializer # Use the default serializer for other actions (retrieve, list)
    
    def create(self, request, *args, **kwargs):
        """Create a new user via the service layer (handles profile + tasks)."""
        serializer = self.get_serializer(data=request.data) # Validate the input data using the appropriate serializer for user creation
        serializer.is_valid(raise_exception=True) # Raise a validation error if the input data is
        
        user = create_user(serializer.validated_data, created_by=request.user) # Create the user using the create_user service function, which handles profile creation and triggers a welcome email task
        
        return Response(
            UserSerializer(user).data, status=status.HTTP_201_CREATED
        ) # Return the created user data serialized with the default UserSerializer
        
    def perform_destroy(self, instance):
        """
        Soft delete by deactivating the user instead of hard deletion. Admins can reactivate if needed.
        """
        instance.is_active = False # Set the user's active status to False to deactivate the account
        instance.save(update_fields=["is_active"]) # Save the changes to the database
        
        logger.info("User %s deactivated by %s.", instance.email, self.request.user.email) # Log the deactivation event with the user's email and the admin who performed the action
        
    @action(
        detail=True,
        methods=['get', 'patch'],
        permission_classes=[IsAdminOrSelf],
        url_path='profile',
    )
    def profile(self, request, pk=None):
        """Retrieve or partially update a user's profile."""
        user = self.get_object()
        profile: Profile = user.profile # Access the related Profile object through the user instance
        
        if request.method == "PATCH":
            serializer = ProfileSerializer(profile, data=request.data, partial=True)    # Validate the input data for partial update using the ProfileSerializer
            
            serializer.is_valid(raise_exception=True)
            serializer.save()   # Save the updated profile data to the database
            
            return Response(serializer.data, status=status.HTTP_200_OK) # Return the updated profile data serialized with ProfileSerializer
        
        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK) # Return the profile data serialized with ProfileSerializer for GET requests