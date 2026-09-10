from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import AuditLog, Department, Role, Team, User


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True, default=None)
    actor_email = serializers.CharField(source='actor.email', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_email', 'action',
            'target_type', 'target_id', 'target_repr', 'metadata', 'created_at',
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'department']


class UserSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    avatar = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'department', 'department_name', 'team', 'manager', 'job_title',
            'phone', 'location', 'bio', 'avatar', 'language', 'email_notifications',
            'is_active', 'date_joined', 'stats',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'department', 'team', 'manager',
            'is_active', 'date_joined', 'full_name',
        ]

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url

    def get_stats(self, obj):
        return {
            'courses_in_progress': obj.courses_in_progress,
            'courses_completed': obj.courses_completed,
            'certificates': obj.certificates_count,
            'learning_hours': round(obj.learning_minutes / 60),
            'avg_quiz_score': obj.avg_quiz_score,
            'streak_days': obj.streak_days,
            'points': obj.points,
        }


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        full_name = validated_data['full_name'].strip()
        parts = full_name.split()
        first = parts[0] if parts else full_name
        last = ' '.join(parts[1:])
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first,
            last_name=last,
            department=validated_data.get('department'),
            role=Role.USER,
        )


class AdminUserSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True, default=None)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'role',
            'department', 'department_name', 'team', 'manager', 'manager_name',
            'job_title', 'is_active', 'language', 'date_joined', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'full_name']

    def validate_email(self, value):
        value = value.lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user


class AvatarSerializer(serializers.Serializer):
    avatar = serializers.ImageField()

    def validate_avatar(self, value):
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('Image must be 2 MB or smaller.')
        if value.content_type not in ('image/jpeg', 'image/png'):
            raise serializers.ValidationError('Only JPG or PNG images are allowed.')
        return value


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context['request'].user)
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value
