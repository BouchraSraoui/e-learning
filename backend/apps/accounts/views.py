from django.contrib.auth.tokens import default_token_generator
from django.http import HttpResponse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .audit import record_audit
from .bulk import build_export, build_template, run_import
from .filters import UserFilter
from .models import AuditLog, Department, User
from .permissions import IsAdmin
from .serializers import (
    AdminUserSerializer,
    AuditLogSerializer,
    AvatarSerializer,
    DepartmentSerializer,
    ForgotPasswordSerializer,
    PasswordChangeSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)
from .tasks import send_password_reset_email
from .tokens import ActiveTokenRefreshSerializer, EmailTokenObtainPairSerializer


def _tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    serializer_class = RegisterSerializer

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                **_tokens_for(user),
                'user': UserSerializer(user, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    serializer_class = EmailTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    serializer_class = ActiveTokenRefreshSerializer


class LogoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('refresh')
        if token:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class LogoutAllView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        for token in OutstandingToken.objects.filter(user=request.user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(RetrieveUpdateAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request=AvatarSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = AvatarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.avatar = serializer.validated_data['avatar']
        request.user.save(update_fields=['avatar'])
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def delete(self, request):
        request.user.avatar.delete(save=True)
        return Response(UserSerializer(request.user, context={'request': request}).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotPasswordView(APIView):

    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=ForgotPasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            from django.conf import settings

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
            send_password_reset_email.delay(user.email, reset_url)
        return Response({'detail': 'If the account exists, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=ResetPasswordSerializer, responses={200: None})
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {'detail': 'Invalid or expired reset link.', 'code': 'invalid_token'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not default_token_generator.check_token(user, data['token']):
            return Response(
                {'detail': 'Invalid or expired reset link.', 'code': 'invalid_token'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class AdminUserViewSet(viewsets.ModelViewSet):

    queryset = User.objects.select_related('department', 'team', 'manager').all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    filterset_class = UserFilter
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'first_name', 'last_name', 'email']
    ordering = ['first_name', 'last_name']

    def perform_create(self, serializer):
        user = serializer.save()
        record_audit(self.request.user, 'user.create', target=user, target_repr=user.email)

    def perform_update(self, serializer):
        user = serializer.save()
        record_audit(self.request.user, 'user.update', target=user, target_repr=user.email)

    def perform_destroy(self, instance):
        email = instance.email
        record_audit(self.request.user, 'user.delete', target=instance, target_repr=email)
        instance.delete()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        fmt = request.query_params.get('fmt', 'csv').lower()
        queryset = self.filter_queryset(self.get_queryset())
        content, content_type, filename = build_export(queryset, fmt)
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='import-template')
    def import_template(self, request):
        fmt = request.query_params.get('fmt', 'csv').lower()
        content, content_type, filename = build_template(fmt)
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(
        detail=False, methods=['post'], url_path='import',
        parser_classes=[MultiPartParser, FormParser],
    )
    def bulk_import(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response(
                {'detail': 'No file uploaded (multipart field name: file).', 'code': 'no_file'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            report = run_import(upload, actor=request.user)
        except ValueError as exc:
            return Response({'detail': str(exc), 'code': 'invalid_file'},
                            status=status.HTTP_400_BAD_REQUEST)
        record_audit(
            request.user, 'user.import',
            target_repr=f'{report["created"]} created, {report["updated"]} updated',
            metadata={'created': report['created'], 'updated': report['updated'],
                      'errors': len(report['errors'])},
        )
        return Response(report)


class AuditLogListView(ListAPIView):

    queryset = AuditLog.objects.select_related('actor').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['action']
    search_fields = ['target_repr', 'action']
