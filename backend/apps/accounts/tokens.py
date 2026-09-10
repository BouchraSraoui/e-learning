from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user, context=self.context).data
        return data


class ActiveTokenRefreshSerializer(TokenRefreshSerializer):

    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        user_id = token.get('user_id')
        if not User.objects.filter(id=user_id, is_active=True).exists():
            raise InvalidToken('User account is inactive.')
        return super().validate(attrs)
