from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["phone", "avatar", "address", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]
        
        
class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer for retrieving user details, including the related profile.
    """
    profile = ProfileSerializer(read_only=True)  # Nested serializer for the related Profile
    full_name = serializers.CharField(read_only=True)  # Include full name as a read-only field
    
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
            "profile",  # Include the nested profile data
        ]
        read_only_fields = ["id", "date_joined", "last_login", "full_name"]  # full_name is read-only since it's derived from first_name and last_name


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Validates data for creating a new user, including password validation. (admin use only)
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    
    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "role", "password", "confirm_password"]

    def validate_email(self, value):
        normalized = value.strip().lower()  # Normalize email for consistent validation
        
        if User.objects.filter(email__iexact=normalized).exists():  # Check for existing user with the same email (case-insensitive)
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):  # Remove confirm_password from attrs after validation
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        try:
            validate_password(attrs["password"])    # Validate the password using Django's built-in validators
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})   # Return the specific password validation errors to the client
        return attrs
    
    
class UserAdminUpdateSerializer(serializers.ModelSerializer):
    """Allows admins to update any user field including role and active status."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "role", "is_active"]


class UserSelfUpdateSerializer(serializers.ModelSerializer):
    """Allows a user to update only their own name fields."""

    class Meta:
        model = User
        fields = ["first_name", "last_name"]
        
        
class LoginSerializer(serializers.Serializer):
    """
    Login serializer to validate email and password for authentication.
    """
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    
    
class ChangePasswordSerializer(serializers.Serializer):
    """
    Change password serializer to validate old password and new password fields when a user wants to change their password.
    """
    old_password = serializers.CharField(
        style={"input_type": "password"},
        write_only=True,
    )
    new_password = serializers.CharField(
        style={"input_type": "password"},
        write_only=True,
    )
    confirm_new_password = serializers.CharField(
        style={"input_type": "password"},
        write_only=True,
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:  # Ensure new password and confirm new password match
            raise serializers.ValidationError(
                {"confirm_new_password": "Passwords do not match."}
            )
            
        try:
            validate_password(attrs["new_password"])    # Validate the new password using Django's built-in validators
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages})   # Return the specific password validation errors to the client
        return attrs


class MeSerializer(serializers.ModelSerializer):
    """Current authenticated user — used for login response and /me endpoint."""

    profile = ProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
            "profile",
        ]
        read_only_fields = fields