from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
from django.shortcuts import render, get_object_or_404
from .serializers import *
from .models import *
# The star-imports above rebind the bare name ValidationError to Django's.
# Keep an unambiguous handle on DRF's so except clauses catch the right one.
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.db.models import Q
from django.db import transaction, IntegrityError
from django.contrib.auth.hashers import check_password, make_password
from django.conf import settings
from datetime import datetime, timedelta
import datetime as dt
import json
import logging
import qrcode
import io
import os
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
import secrets
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from django.shortcuts import render
import pytz

from .authentication import (
    RoleAwareJWTAuthentication,
    MemberPrincipal,
    issue_member_tokens,
    issue_admin_tokens,
)
from .system_settings import send_email
from .permissions import (
    ActionPermissionMixin,
    IsAdmin,
    IsAdminOrMember,
    IsMember,
    IsSelfOrAdmin,
    PublicCreateOnly,
)

# UK timezone
UK_TIMEZONE = pytz.timezone('Europe/London')

# Superseded by apis.authentication.RoleAwareJWTAuthentication, which resolves
# members against MemberModel instead of indexing auth_user by a member id.
CustomJWTAuthentication = RoleAwareJWTAuthentication

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.conf import settings
import json
import random
import string
import qrcode
from io import BytesIO
import base64

logger = logging.getLogger(__name__)


def first_error_message(exc_or_detail):
    """Pull the first human-readable string out of a DRF ValidationError.

    Accepts the exception or a bare serializer.errors structure. Either is a
    str, list, or dict of lists depending on where the error was raised, and
    str() on any of them leaks the ErrorDetail repr into the UI.
    """
    def walk(detail):
        if isinstance(detail, dict):
            for value in detail.values():
                found = walk(value)
                if found:
                    return found
        elif isinstance(detail, (list, tuple)):
            for item in detail:
                found = walk(item)
                if found:
                    return found
        elif detail is not None:
            return str(detail)
        return None

    return walk(getattr(exc_or_detail, 'detail', exc_or_detail))


def safe_error(exc, context='Request failed'):
    """Log the real exception, return a message that is safe to ship.

    Responses used to interpolate str(exc) straight into the payload, which
    handed clients ORM text, file paths and integrity-constraint details. The
    detail now stays in the server log and the caller gets the context only.
    """
    logger.exception('%s: %s', context, exc)
    return context


def revoke_member_tokens(django_user):
    """Blacklist every outstanding refresh token for a user.

    Called after a password reset so a stolen session cannot outlive the
    credential it was minted from.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken, OutstandingToken,
        )
        for token in OutstandingToken.objects.filter(user=django_user):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception as e:
        logger.warning('Could not revoke tokens for %s: %s', django_user, e)


def resolve_member(request):
    """The MemberModel behind the request, or None.

    Identity comes from the verified token only. The previous
    ``?user_id=`` fallback let an unauthenticated caller name any member.
    """
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return None
    member = getattr(user, 'member', None)
    if member is not None:
        return member
    # Admin acting on their own behalf has no member record.
    return None


class UserViewSet(ActionPermissionMixin, viewsets.ViewSet):
    """Authentication endpoints for the admin console and the member app.

    Everything here is deliberately unauthenticated â€” it is where credentials
    are exchanged for tokens â€” so each action is throttled and none of them
    disclose whether a given account exists.
    """

    permission_map = {
        'login': [AllowAny],
        'logout': [AllowAny],
        'member_login': [AllowAny],
        'member_logout': [AllowAny],
        'password_reset': [AllowAny],
        'verify_reset_code': [AllowAny],
        'set_new_password': [AllowAny],
    }
    default_permissions = [IsAdmin]

    # Generic replies. Reusing one string for "no such account" and "wrong
    # password" keeps the endpoints from being used to enumerate members.
    INVALID_CREDENTIALS = 'Invalid username or password'
    INVALID_RESET = 'Invalid or expired verification code'

    def get_throttles(self):
        scopes = {
            'login': 'login',
            'member_login': 'login',
            'password_reset': 'password_reset',
            'verify_reset_code': 'reset_verify',
            'set_new_password': 'reset_verify',
        }
        self.throttle_scope = scopes.get(self.action)
        return super().get_throttles()

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"detail": "Username and password are required"},
                            status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)

        if user and user.is_active and (user.is_superuser or user.is_staff):
            tokens = issue_admin_tokens(user)
            return Response({
                'refresh': str(tokens),
                'access': str(tokens.access_token),
                'user_type': 'superuser',
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
            }, status=status.HTTP_200_OK)

        return Response(
            {"detail": self.INVALID_CREDENTIALS},
            status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if not refresh_token:
                return Response({"detail": "Refresh token is required"},
                                status=status.HTTP_400_BAD_REQUEST)

            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful"}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Admin logout failed: %s', e)
            return Response({"detail": "Logout failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def member_login(self, request):
        """Exchange member email + password for a member-scoped token pair."""
        try:
            data = request.data

            if not data.get('username') or not data.get('password'):
                return Response({
                    'code': 0,
                    'message': 'Username and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            input_password = data.get('password')

            try:
                member = MemberModel.objects.get(email=data.get('username'), hideStatus=0)
            except MemberModel.DoesNotExist:
                # Spend the same work as the success path so response time does
                # not reveal whether the address is registered.
                make_password(input_password)
                return Response({
                    'code': 0,
                    'message': self.INVALID_CREDENTIALS
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Only the one-way hash is consulted. The reversible
            # encrypted_password/plaintext columns are gone.
            if not member.hashed_password or not check_password(input_password, member.hashed_password):
                return Response({
                    'code': 0,
                    'message': self.INVALID_CREDENTIALS
                }, status=status.HTTP_401_UNAUTHORIZED)

            refresh = issue_member_tokens(member)

            return Response({
                'code': 1,
                'message': 'Login successful',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user_type': 'member',
                'user_id': member.id,
                'username': member.email,
                'email': member.email
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Login failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def member_logout(self, request):
        """Blacklist a member refresh token."""
        try:
            refresh_token = request.data.get('refresh_token')

            if not refresh_token:
                return Response({
                    'code': 0,
                    'message': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response({
                    'code': 1,
                    'message': 'Logout successful'
                }, status=status.HTTP_200_OK)
            except TokenError:
                return Response({
                    'code': 0,
                    'message': 'Invalid or expired token'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.exception('Member logout failed: %s', e)
            return Response({
                'code': 1,
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['POST'])
    def password_reset(self, request):
        """Mail a single-use verification code to a member.

        The code is stored as a salted hash, so leaking a member row no longer
        hands over the ability to reset that member's password.
        """
        try:
            email = (request.data.get('email') or '').strip()

            if not email:
                return Response({
                    'code': 0,
                    'message': 'Email is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Always the same reply whether or not the address is on file.
            generic_response = Response({
                'code': 1,
                'message': 'If that email is registered, a verification code has been sent.'
            }, status=status.HTTP_200_OK)

            try:
                member = MemberModel.objects.get(email__iexact=email, hideStatus=0)
            except MemberModel.DoesNotExist:
                return generic_response

            verification_code = f'{secrets.randbelow(1000000):06d}'
            uk_now = timezone.now().astimezone(UK_TIMEZONE)

            member.reset_token = make_password(verification_code)
            member.reset_token_expiry = uk_now + dt.timedelta(minutes=15)
            member.reset_attempts = 0
            member.save(update_fields=['reset_token', 'reset_token_expiry', 'reset_attempts'])

            subject = 'Password Reset - Verification Code'
            message = f'''
    Dear {member.firstName or 'Member'},

    You have requested to reset your password for your Golf Club account.

    Your verification code is: {verification_code}

    This code will expire in 15 minutes.

    If you did not request a password reset, please ignore this email.

    Best regards,
    Master Golf Club Management
            '''

            try:
                send_email(subject, message, email, fail_silently=False)
            except Exception as email_error:
                logger.exception('Reset email failed: %s', email_error)
                return Response({
                    'code': 0,
                    'message': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # The code is never echoed back, in any environment.
            return generic_response

        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Password reset request failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _match_reset_code(self, email, verification_code):
        """Resolve (member, error_response) for an email + code pair.

        The lookup is keyed on the email, so a code is only ever valid for the
        account that requested it. Previously the code alone identified the
        member, which made a 6-digit space brute-forceable across every member
        at once.
        """
        try:
            member = MemberModel.objects.get(email__iexact=(email or '').strip(), hideStatus=0)
        except MemberModel.DoesNotExist:
            return None, Response({'code': 0, 'message': self.INVALID_RESET},
                                  status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if (not member.reset_token or not member.reset_token_expiry
                or member.reset_token_expiry <= now):
            return None, Response({'code': 0, 'message': self.INVALID_RESET},
                                  status=status.HTTP_400_BAD_REQUEST)

        if member.reset_attempts >= 5:
            # Burn the code rather than let guessing continue.
            member.reset_token = None
            member.reset_token_expiry = None
            member.save(update_fields=['reset_token', 'reset_token_expiry'])
            return None, Response({'code': 0, 'message': self.INVALID_RESET},
                                  status=status.HTTP_400_BAD_REQUEST)

        if not check_password(str(verification_code), member.reset_token):
            member.reset_attempts += 1
            member.save(update_fields=['reset_attempts'])
            return None, Response({'code': 0, 'message': self.INVALID_RESET},
                                  status=status.HTTP_400_BAD_REQUEST)

        return member, None

    @action(detail=False, methods=['POST'])
    def verify_reset_code(self, request):
        """Check an email + code pair without changing the password."""
        try:
            email = request.data.get('email')
            verification_code = request.data.get('verification_code')

            if not email or not verification_code:
                return Response({
                    'code': 0,
                    'message': 'Email and verification code are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            member, error = self._match_reset_code(email, verification_code)
            if error:
                return error

            return Response({
                'code': 1,
                'message': 'Verification code is valid'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Verification failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def set_new_password(self, request):
        """Set a new password given a valid email + code pair."""
        try:
            email = request.data.get('email')
            verification_code = request.data.get('verification_code')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')

            if not all([email, verification_code, new_password, confirm_password]):
                return Response({
                    'code': 0,
                    'message': 'Email, verification code, new password and confirmation are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            if new_password != confirm_password:
                return Response({
                    'code': 0,
                    'message': 'Passwords do not match'
                }, status=status.HTTP_400_BAD_REQUEST)

            member, error = self._match_reset_code(email, verification_code)
            if error:
                return error

            try:
                validate_password(new_password)
            except DjangoValidationError as pw_error:
                return Response({
                    'code': 0,
                    'message': ' '.join(pw_error.messages)
                }, status=status.HTTP_400_BAD_REQUEST)

            member.hashed_password = make_password(new_password)
            member.reset_token = None
            member.reset_token_expiry = None
            member.reset_attempts = 0
            member.save(update_fields=[
                'hashed_password', 'reset_token', 'reset_token_expiry', 'reset_attempts',
            ])

            # Keep the shadow auth_user row in step and cut existing sessions.
            try:
                django_user = User.objects.get(username=member.email)
                django_user.set_password(new_password)
                django_user.save()
                revoke_member_tokens(django_user)
            except User.DoesNotExist:
                pass

            return Response({
                'code': 1,
                'message': 'Password has been reset successfully'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Password reset failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'])
    def profile(self, request):
        """Current admin profile.

        URL: /apis/user/profile/
        """
        try:
            user = request.user
            return Response({
                'code': 1,
                'message': 'Profile retrieved successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': 'admin' if (user.is_superuser or user.is_staff) else 'user',
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving profile')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['PUT', 'PATCH'], url_path='update-profile')
    def update_profile(self, request):
        """Update the current admin's username/email.

        URL: /apis/user/update-profile/
        """
        try:
            user = request.user
            data = request.data or {}

            if not any(key in data for key in ('username', 'email')):
                return Response({
                    'code': 0,
                    'message': 'Username or email is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            update_fields = []
            if 'username' in data:
                username = str(data.get('username') or '').strip()
                if not username:
                    return Response({
                        'code': 0,
                        'message': 'Username cannot be empty'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
                    return Response({
                        'code': 0,
                        'message': 'That username is already taken'
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.username = username
                update_fields.append('username')

            if 'email' in data:
                email = str(data.get('email') or '').strip()
                if not email:
                    return Response({
                        'code': 0,
                        'message': 'Email cannot be empty'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                    return Response({
                        'code': 0,
                        'message': 'That email is already in use'
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.email = email
                update_fields.append('email')

            try:
                user.full_clean()
            except DjangoValidationError as exc:
                return Response({
                    'code': 0,
                    'message': ' '.join(exc.messages)
                }, status=status.HTTP_400_BAD_REQUEST)

            user.save(update_fields=update_fields)

            return Response({
                'code': 1,
                'message': 'Profile updated successfully',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': 'admin' if (user.is_superuser or user.is_staff) else 'user',
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Profile update failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserTypeViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    default_permissions = [IsAdmin]
    queryset = UserTypeModel.objects.filter(hideStatus=0)
    serializer_class = UserTypeModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = UserTypeModelSerializers(UserTypeModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = UserTypeModelSerializers(UserTypeModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                                  many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = UserTypeModelSerializers(data=request.data)
        else:
            serializer = UserTypeModelSerializers(instance=UserTypeModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        UserTypeModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class CountryViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = CountryModel.objects.filter(hideStatus=0)
    serializer_class = CountryModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            countries = CountryModel.objects.filter(hideStatus=0).order_by('-id')
        else:
            countries = CountryModel.objects.filter(hideStatus=0, id=pk).order_by('-id')

        serializer = CountryModelSerializers(countries, many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = CountryModelSerializers(data=request.data)
        else:
            instance = CountryModel.objects.get(id=pk)
            serializer = CountryModelSerializers(instance=instance, data=request.data)

        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}

        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        CountryModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PaymentMethodViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    default_permissions = [IsAdmin]
    queryset = PaymentMethodModel.objects.filter(hideStatus=0)
    serializer_class = PaymentMethodModelSerializer

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PaymentMethodModelSerializer(PaymentMethodModel.objects.filter(hideStatus=0).order_by('-id'),
                                                      many=True)
        else:
            serializer = PaymentMethodModelSerializer(
                PaymentMethodModel.objects.filter(hideStatus=0, id=pk).order_by('-id'), many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PaymentMethodModelSerializer(data=request.data)
        else:
            serializer = PaymentMethodModelSerializer(instance=PaymentMethodModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        PaymentMethodModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PaymentStatusViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    default_permissions = [IsAdmin]
    queryset = PaymentStatusModel.objects.filter(hideStatus=0)
    serializer_class = PaymentStatusModelSerializer

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PaymentStatusModelSerializer(PaymentStatusModel.objects.filter(hideStatus=0).order_by('-id'),
                                                      many=True)
        else:
            serializer = PaymentStatusModelSerializer(
                PaymentStatusModel.objects.filter(hideStatus=0, id=pk).order_by('-id'), many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PaymentStatusModelSerializer(data=request.data)
        else:
            serializer = PaymentStatusModelSerializer(instance=PaymentStatusModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        PaymentStatusModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class GenderViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = GenderModel.objects.filter(hideStatus=0)
    serializer_class = GenderModelSerializer

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = GenderModelSerializer(GenderModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = GenderModelSerializer(GenderModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                               many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = GenderModelSerializer(data=request.data)
        else:
            serializer = GenderModelSerializer(instance=GenderModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        GenderModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)





class PlanFeatureViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing plan features"""
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = PlanFeatureModel.objects.filter(hideStatus=0)
    serializer_class = PlanFeatureSerializer

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            # Get features for all plans
            serializer = PlanFeatureSerializer(PlanFeatureModel.objects.filter(hideStatus=0).order_by('plan__id', 'order'), many=True)
        else:
            # Get features for specific plan
            serializer = PlanFeatureSerializer(PlanFeatureModel.objects.filter(hideStatus=0, plan_id=pk).order_by('order'), many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == "0":
                # Creating a new feature
                serializer = PlanFeatureSerializer(data=request.data)
            else:
                # Updating an existing feature
                try:
                    instance = PlanFeatureModel.objects.get(id=pk)
                    serializer = PlanFeatureSerializer(instance=instance, data=request.data)
                except PlanFeatureModel.DoesNotExist:
                    return Response({'code': 0, 'message': "Feature not found"}, status=404)
            
            if serializer.is_valid():
                serializer.save()
                response = {'code': 1, 'message': "Done Successfully"}
            else:
                response = {'code': 0, 'message': "Unable to Process Request", 'errors': serializer.errors}
            return Response(response)
        except Exception as e:
            return Response({'code': 0, 'message': safe_error(e, 'Error')}, status=500)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        PlanFeatureModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PlanViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = PlanModel.objects.filter(hideStatus=0)
    serializer_class = PlanModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PlanModelSerializers(PlanModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = PlanModelSerializers(PlanModel.objects.filter(hideStatus=0, id=pk).order_by('-id'), many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PlanModelSerializers(data=request.data)
        else:
            serializer = PlanModelSerializers(instance=PlanModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            plan = serializer.save()
            response = {'code': 1, 'message': "Done Successfully", 'data': serializer.data}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        PlanModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class MemberViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    queryset = MemberModel.objects.filter(hideStatus=0)
    serializer_class = MemberModelSerializers

    # Member records are the crown jewels: the roster is admin-only, and the
    # self-service routes are pinned to the caller's own id by IsSelfOrAdmin.
    permission_map = {
        'listing': [IsAdmin],
        'processing': [IsAdmin],
        'deletion': [IsAdmin],
        'create_sample_members': [IsAdmin],
        'get_last_member_id': [IsAdmin],
        'list': [IsAdmin],
        'create': [IsAdmin],
        'update': [IsAdmin],
        'partial_update': [IsAdmin],
        'destroy': [IsAdmin],
        # Detail routes a member may use against their own record only.
        'retrieve': [IsSelfOrAdmin],
        'get_profile': [IsSelfOrAdmin],
        'update_profile': [IsSelfOrAdmin],
        'get_member_qr_code': [IsSelfOrAdmin],
        # Collection routes that resolve identity from the token.
        'get_current_profile': [IsMember],
        'get_current_member_qr_code': [IsMember],
        'get_current_memberships': [IsMember],
        # Gate staff scan the QR at the door with an admin session.
        'verify_qr_code': [IsAdmin],
    }
    default_permissions = [IsAdmin]

    def generate_qr_code(self, qr_token: str):
        """
        Generate QR code for member verification
        """
        try:
            # FIXED: Use mastergolfclub.com instead of mastergolfclub.com for QR code URLs
            qr_url = f"https://mastergolfclub.com/member/verify/{qr_token}/"
            
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_url)
            qr.make(fit=True)

            # Create QR code image
            qr_image = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64 for email attachment
            buffer = io.BytesIO()
            qr_image.save(buffer, format='PNG')
            buffer.seek(0)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"QR Code generation error: {str(e)}")
            return None

    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        """
        Send email with credentials and QR code to new member
        """
        try:
            
            # Generate QR code
            qr_image_data = self.generate_qr_code(qr_token)
            
            if not qr_image_data:
                logger.error("Failed to generate QR code")
                return False

            subject = 'Your Golf Club Membership Credentials & QR Code'
            
            # Text message
            text_message = f'''
Dear Member,

Your golf club membership account has been created successfully.

Your membership details:
Member ID: {member_id}

Login credentials:
Username: {email}
Password: {password}

Please find your membership QR code attached. This QR code can be used for quick verification at the club.

Please change your password upon first login.

Best regards,
Master Golf Club Management
            '''

            # HTML message
            html_message = f'''
<html>
<body>
    <h2>Welcome to Golf Club!</h2>
    <p>Dear Member,</p>
    <p>Your golf club membership account has been created successfully.</p>
    
    <h3>Your membership details:</h3>
    <p><strong>Member ID:</strong> {member_id}</p>
    
    <h3>Login credentials:</h3>
    <p><strong>Username:</strong> {email}</p>
    <p><strong>Password:</strong> {password}</p>
    
    <p>Please find your membership QR code attached. This QR code can be used for quick verification at the club.</p>
    
    <p><strong>Important:</strong> Please change your password upon first login.</p>
    
    <p>Best regards,<br>Master Golf Club Management</p>
</body>
</html>
            '''

            # Create email message using the admin-managed SMTP config
            qr_attachment = (f'membership_qr_{member_id}.png', qr_image_data, 'image/png')
            
            
            # Send email
            send_email(subject, text_message, email, html_message=html_message, attachments=[qr_attachment])
            
            return True
            
        except Exception as e:
            logger.error(f"Email sending error: {str(e)}")
            return False

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = MemberModelSerializers(MemberModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = MemberModelSerializers(MemberModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                                many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            data = request.data.copy()
            plain_password = None

            # If this is a new member creation
            if pk == "0" and 'password' in data:
                plain_password = data['password']
                # The password never reaches the serializer: it is not a
                # writable field, and only its hash is persisted below.
                data.pop('password', None)

            if pk == "0":
                serializer = MemberModelSerializers(data=data)
            else:
                serializer = MemberModelSerializers(
                    instance=MemberModel.objects.get(id=pk),
                    data=data
                )

            if serializer.is_valid():
                member = serializer.save()

                if plain_password:
                    member.hashed_password = make_password(plain_password)
                    member.save(update_fields=['hashed_password'])

                # For new member, send credentials email and log credentials
                if pk == "0" and member.email and plain_password:
                    # Credentials and the QR token are deliberately not logged.
                    # Send credentials email
                    email_sent = False
                    try:
                        email_sent = self.send_credentials_with_qr_email(
                            member.email, 
                            member.golfClubId, 
                            plain_password, 
                            member.qr_token
                        )
                        if not email_sent:
                            logger.error("Failed to send credentials email")
                    except Exception as email_error:
                        logger.error(f"Error sending credentials email: {str(email_error)}")
                    
                    response = {
                        'code': 1,
                        'message': f"Member created successfully. {'Credentials have been sent to the member\'s email.' if email_sent else 'Failed to send credentials email. Please check the logs.'}",
                        'data': {
                            'member_id': member.golfClubId,
                            'email': member.email,
                            'password': plain_password,
                            'qr_token': member.qr_token,
                            'email_sent': email_sent
                        }
                    }
                else:
                    response = {
                        'code': 1,
                        'message': "Member processed successfully"
                    }
            else:
                logger.error(f"Serializer validation failed: {serializer.errors}")
                response = {
                    'code': 0,
                    'message': "Unable to Process Request",
                    'errors': serializer.errors
                }

        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            response = {'code': 0, 'message': safe_error(e, 'Request failed')}

        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        MemberModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        # SECURITY/PRIVACY: members are never hard-deleted. A destroy call
        # soft-hides the record so it leaves all listing/roster queries.
        MemberModel.objects.filter(id=kwargs.get('pk')).update(hideStatus=1)
        return Response({'code': 1, 'message': "Done Successfully"})

    @action(detail=True, methods=['GET'], url_path='profile')
    def get_profile(self, request, pk=None):
        """
        Get member's profile by ID
        URL: /apis/member/{id}/profile/
        """
        try:
            # Use the pk from URL parameter
            member_id = pk
            
            if not member_id or member_id == '0':
                return Response({
                    'code': 0,
                    'message': 'Member ID is required',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                member = MemberModel.objects.get(id=member_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Member profile not found',
                    'data': None
                }, status=status.HTTP_404_NOT_FOUND)

            # Serialize the member data
            serializer = MemberModelSerializers(member)
            
            # Enhance the response with additional calculated fields
            profile_data = serializer.data
            
            # Add calculated fields
            if member.membershipEndDate:
                from datetime import date
                end_date = member.membershipEndDate
                if isinstance(end_date, str):
                    end_date = dt.datetime.strptime(end_date, '%Y-%m-%d').date()
                
                today = date.today()
                days_until_expiry = (end_date - today).days
                profile_data['daysUntilExpiry'] = max(0, days_until_expiry)
                profile_data['membershipStatus'] = 'Active' if days_until_expiry > 0 else 'Expired'
            else:
                profile_data['daysUntilExpiry'] = 0
                profile_data['membershipStatus'] = 'Active'
            
            # Calculate age if date of birth exists
            if member.dateOfBirth:
                from datetime import date
                today = date.today()
                birth_date = member.dateOfBirth
                if isinstance(birth_date, str):
                    birth_date = dt.datetime.strptime(birth_date, '%Y-%m-%d').date()
                
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                profile_data['age'] = age
            
            # Add member activity data (extend based on your needs)
            profile_data['lastVisit'] = None  # Add logic to get last visit
            profile_data['totalVisits'] = 0    # Add logic to count total visits
            profile_data['membershipLevel'] = 'Gold'  # Add logic based on business rules
            
            # Add preferences (you might need a separate preferences table)
            profile_data['preferences'] = {
                'newsletter': True,
                'language': 'English',
                'notifications': True
            }

            
            return Response({
                'code': 1,
                'message': 'Profile retrieved successfully',
                'data': profile_data
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.error(f"Invalid member ID format: {str(e)}")
            return Response({
                'code': 0,
                'message': 'Invalid member ID format',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error retrieving profile: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving profile'),
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # FIXED: Changed from detail=False to detail=True and use pk parameter
    @action(detail=True, methods=['PUT', 'PATCH'], url_path='update-profile')
    def update_profile(self, request, pk=None):
        """
        Update member's profile by ID
        URL: /apis/member/{id}/update-profile/
        """
        try:
            member_id = pk
            
            if not member_id or member_id == '0':
                return Response({
                    'code': 0,
                    'message': 'Member ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                member = MemberModel.objects.get(id=member_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Member profile not found'
                }, status=status.HTTP_404_NOT_FOUND)

            # SECURITY: strip identity/billing/admin-controlled fields before
            # saving. A member must not self-modify their login email, plan,
            # membership dates, or visibility through update-profile â€” those are
            # set exclusively by the admin create/update endpoints.
            update_data = dict(request.data)
            for protected_field in [
                'email', 'plan', 'membershipStartDate', 'membershipEndDate',
                'hideStatus', 'golfClubId', 'enquiryId', 'enquiryMessage',
                'createdAt', 'updatedAt',
            ]:
                update_data.pop(protected_field, None)

            # Update the member with provided data
            serializer = MemberModelSerializers(
                instance=member,
                data=update_data,
                partial=True  # Allow partial updates
            )

            if serializer.is_valid():
                updated_member = serializer.save()
                
                return Response({
                    'code': 1,
                    'message': 'Profile updated successfully',
                    'data': serializer.data
                })
            else:
                logger.error(f"Profile update validation failed: {serializer.errors}")
                return Response({
                    'code': 0,
                    'message': 'Validation failed',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error updating profile')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ADD: New method for current user profile (if you have authentication)
    @action(detail=False, methods=['GET'], url_path='current-profile')
    def get_current_profile(self, request):
        """
        Get current authenticated user's profile
        URL: /apis/member/current-profile/
        """
        try:
            # Identity comes from the verified token only. The old
            # `?user_id=` fallback let any caller name any member.
            member = resolve_member(request)
            if member is None:
                return Response({
                    'code': 0,
                    'message': 'User authentication required',
                    'data': None
                }, status=status.HTTP_401_UNAUTHORIZED)
            user_id = member.id

            try:
                member = MemberModel.objects.get(id=user_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Member profile not found',
                    'data': None
                }, status=status.HTTP_404_NOT_FOUND)

            # Use the same logic as get_profile
            serializer = MemberModelSerializers(member)
            profile_data = serializer.data
            
            # Add calculated fields (same as above)
            if member.membershipEndDate:
                from datetime import date
                end_date = member.membershipEndDate
                if isinstance(end_date, str):
                    end_date = dt.datetime.strptime(end_date, '%Y-%m-%d').date()
                
                today = date.today()
                days_until_expiry = (end_date - today).days
                profile_data['daysUntilExpiry'] = max(0, days_until_expiry)
                profile_data['membershipStatus'] = 'Active' if days_until_expiry > 0 else 'Expired'
            else:
                profile_data['daysUntilExpiry'] = 0
                profile_data['membershipStatus'] = 'Active'
            
            if member.dateOfBirth:
                from datetime import date
                today = date.today()
                birth_date = member.dateOfBirth
                if isinstance(birth_date, str):
                    birth_date = dt.datetime.strptime(birth_date, '%Y-%m-%d').date()
                
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                profile_data['age'] = age
            
            profile_data['lastVisit'] = None
            profile_data['totalVisits'] = 0
            profile_data['membershipLevel'] = 'Gold'
            profile_data['preferences'] = {
                'newsletter': True,
                'language': 'English',
                'notifications': True
            }

            return Response({
                'code': 1,
                'message': 'Profile retrieved successfully',
                'data': profile_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving current profile: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving profile'),
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # FIXED: Changed the URL pattern to match what's used in the HTML template
    @action(detail=False, methods=['GET'], url_path='verify-qr/(?P<qr_token>[^/.]+)')
    def verify_qr_code(self, request, qr_token=None):
        """
        Verify QR code and return member details
        """
        try:
            
            # Find member by QR token
            member = MemberModel.objects.get(qr_token=qr_token, hideStatus=0)
            
            
            # Serialize member data
            serializer = MemberQRDetailSerializer(member, context={'request': request})
            
            response = {
                'code': 1,
                'data': serializer.data,
                'message': 'Member details retrieved successfully'
            }
            
            return Response(response)
            
        except MemberModel.DoesNotExist:
            logger.error("Member not found for provided QR token")
            return Response({
                'code': 0,
                'message': 'Invalid QR code or member not found'
            }, status=404)
            
        except Exception as e:
            logger.error(f"Error verifying QR code: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error verifying QR code')
            }, status=500)

    @action(detail=False, methods=['POST'], url_path='create-sample-members')
    def create_sample_members(self, request):
        """
        Create 10 sample members for testing purposes
        """
        # Seeds accounts with guessable passwords; never allowed off a dev box.
        if not settings.DEBUG:
            return Response({
                'code': 0,
                'message': 'Sample data creation is disabled in this environment.'
            }, status=status.HTTP_403_FORBIDDEN)
        try:
            from datetime import date, timedelta
            import random
            
            # Sample data for creating members
            sample_names = [
                {"firstName": "John", "lastName": "Smith", "email": "john.smith@example.com"},
                {"firstName": "Sarah", "lastName": "Johnson", "email": "sarah.johnson@example.com"},
                {"firstName": "Michael", "lastName": "Brown", "email": "michael.brown@example.com"},
                {"firstName": "Emily", "lastName": "Davis", "email": "emily.davis@example.com"},
                {"firstName": "David", "lastName": "Wilson", "email": "david.wilson@example.com"},
                {"firstName": "Lisa", "lastName": "Anderson", "email": "lisa.anderson@example.com"},
                {"firstName": "Robert", "lastName": "Taylor", "email": "robert.taylor@example.com"},
                {"firstName": "Jennifer", "lastName": "Martinez", "email": "jennifer.martinez@example.com"},
                {"firstName": "William", "lastName": "Garcia", "email": "william.garcia@example.com"},
                {"firstName": "Amanda", "lastName": "Rodriguez", "email": "amanda.rodriguez@example.com"}
            ]
            
            # Get required data
            plan = PlanModel.objects.filter(hideStatus=0).first()
            gender = GenderModel.objects.filter(hideStatus=0).first()
            nationality = CountryModel.objects.filter(hideStatus=0).first()
            payment_status = PaymentStatusModel.objects.filter(hideStatus=0).first()
            payment_method = PaymentMethodModel.objects.filter(hideStatus=0).first()
            
            if not plan:
                return Response({
                    'code': 0,
                    'message': "No plan available. Please create a plan first."
                })
            
            created_members = []
            
            for i, name_data in enumerate(sample_names, 1):
                # Generate unique email if needed
                base_email = name_data['email']
                base_email = name_data['email']
                if MemberModel.objects.filter(email=base_email).exists():
                    base_email = "member{}.{}".format(i, name_data['email'])

                member_data = {
                    'firstName': name_data['firstName'],
                    'lastName': name_data['lastName'],
                    'email': base_email,
                    'phoneNumber': f"+1-555-{1000 + i:04d}",
                    'password': f"password{i}",
                    'plan': plan.id,
                    'gender': gender.id if gender else None,
                    'nationality': nationality.id if nationality else None,
                    'paymentStatus': payment_status.id if payment_status else None,
                    'paymentMethod': payment_method.id if payment_method else None,
                    'address': f"{100 + i} Sample Street, Test City, TC {10000 + i}",
                    'dateOfBirth': date(1980 + i, (i % 12) + 1, (i % 28) + 1),
                    'membershipStartDate': date.today(),
                    'membershipEndDate': date.today() + timedelta(days=365),
                    'emergencyContactName': f"Emergency Contact {i}",
                    'emergencyContactPhone': f"+1-555-{2000 + i:04d}",
                    'emergencyContactRelation': "Spouse",
                    'referredBy': "Sample Referral",
                    'handicap': random.choice([True, False])
                }
                
                sample_password = member_data.pop('password')

                # Create member
                serializer = MemberModelSerializers(data=member_data)
                if serializer.is_valid():
                    member = serializer.save()
                    member.hashed_password = make_password(sample_password)
                    member.save(update_fields=['hashed_password'])
                    
                    created_members.append({
                        'id': member.id,
                        'golfClubId': member.golfClubId,
                        'email': member.email,
                        'password': sample_password,
                        'fullName': f"{member.firstName} {member.lastName}",
                        'phone': member.phoneNumber
                    })
                else:
                    logger.error(f"Failed to create sample member {i}: {serializer.errors}")
            
            
            return Response({
                'code': 1,
                'message': f"Successfully created {len(created_members)} sample members",
                'data': created_members
            })
            
        except Exception as e:
            logger.error(f"Error creating sample members: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error creating sample members')
            })

    @action(detail=False, methods=['GET'], url_path='last-member-id/(?P<year>[^/.]+)/(?P<month>[^/.]+)')
    def get_last_member_id(self, request, year=None, month=None):
        try:
            # Pattern to match: MGCyymm#### where yy is year and mm is month
            pattern = rf'MGC{year}{month}\d{{4}}$'

            # Query for members with matching golf club IDs for the specified year and month
            members = MemberModel.objects.filter(
                Q(golfClubId__regex=pattern),
                hideStatus=0
            ).order_by('-golfClubId')

            if members.exists():
                last_member = members.first()
                response = {
                    'code': 1,
                    'data': {'memberId': last_member.golfClubId},
                    'message': 'Last member ID retrieved successfully'
                }
            else:
                response = {
                    'code': 1,
                    'data': {'memberId': None},
                    'message': 'No existing members found for the specified period'
                }

            return Response(response)

        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving last member ID')
            }, status=500)

    @action(detail=True, methods=['GET'], url_path='qr-code')
    def get_member_qr_code(self, request, pk=None):
        """
        Get QR code for a specific member
        """
        try:
            
            # Get the member
            member = MemberModel.objects.get(id=pk, hideStatus=0)
            
            if not member.qr_token:
                logger.error(f"No QR token found for member {pk}")
                return Response({
                    'code': 0,
                    'message': 'QR token not found for this member'
                }, status=404)
            
            # Generate QR code
            qr_image_data = self.generate_qr_code(member.qr_token)
            
            if not qr_image_data:
                logger.error(f"Failed to generate QR code for member {pk}")
                return Response({
                    'code': 0,
                    'message': 'Failed to generate QR code'
                }, status=500)
            
            # Convert to base64 for API response
            import base64
            qr_base64 = base64.b64encode(qr_image_data).decode('utf-8')
            
            
            return Response({
                'code': 1,
                'message': 'QR code generated successfully',
                'data': {
                    'qrCode': qr_base64,
                    'qrToken': member.qr_token,
                    'memberId': member.golfClubId,
                    'memberName': f"{member.firstName} {member.lastName}"
                }
            })
            
        except MemberModel.DoesNotExist:
            logger.error(f"Member not found: {pk}")
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except Exception as e:
            logger.error(f"Error generating QR code: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error generating QR code')
            }, status=500)

    @action(detail=False, methods=['GET'], url_path='current-qr-code')
    def get_current_member_qr_code(self, request):
        """
        Get QR code for the currently authenticated member
        """
        try:
            # Identity comes from the verified token only. The old
            # `?user_id=` fallback let any caller name any member.
            member = resolve_member(request)
            if member is None:
                return Response({
                    'code': 0,
                    'message': 'User authentication required'
                }, status=401)
            user_id = member.id
            
            # Find member by user ID
            try:
                member = MemberModel.objects.get(id=user_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Member profile not found'
                }, status=404)
            
            if not member.qr_token:
                logger.error(f"No QR token found for current member {member.id}")
                return Response({
                    'code': 0,
                    'message': 'QR token not found for this member'
                }, status=404)
            
            # Generate QR code
            qr_image_data = self.generate_qr_code(member.qr_token)
            
            if not qr_image_data:
                logger.error(f"Failed to generate QR code for current member {member.id}")
                return Response({
                    'code': 0,
                    'message': 'Failed to generate QR code'
                }, status=500)
            
            # Convert to base64 for API response
            import base64
            qr_base64 = base64.b64encode(qr_image_data).decode('utf-8')
            
            
            return Response({
                'code': 1,
                'message': 'QR code generated successfully',
                'data': {
                    'qrCode': qr_base64,
                    'qrToken': member.qr_token,
                    'memberId': member.golfClubId,
                    'memberName': f"{member.firstName} {member.lastName}",
                    'memberEmail': member.email
                }
            })
            
        except MemberModel.DoesNotExist:
            logger.error("Current member not found")
            return Response({
                'code': 0,
                'message': 'Member profile not found'
            }, status=404)
        except Exception as e:
            logger.error(f"Error generating QR code for current member: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error generating QR code')
            }, status=500)

    @action(detail=False, methods=['GET'], url_path='current-memberships')
    def get_current_memberships(self, request):
        """
        Get current memberships for the authenticated member
        """
        try:
            # Identity comes from the verified token only. The old
            # `?user_id=` fallback let any caller name any member.
            member = resolve_member(request)
            if member is None:
                return Response({
                    'code': 0,
                    'message': 'User authentication required'
                }, status=401)
            user_id = member.id
            
            # Find member by user ID
            try:
                member = MemberModel.objects.get(id=user_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Member profile not found'
                }, status=404)
            
            # Get plan details
            plan = None
            if member.plan:
                try:
                    plan = PlanModel.objects.get(id=member.plan, hideStatus=0)
                except PlanModel.DoesNotExist:
                    pass
            
            # Calculate membership status
            from datetime import date
            today = date.today()
            is_active = False
            status = 'Inactive'
            
            if member.membershipEndDate:
                end_date = member.membershipEndDate
                if isinstance(end_date, str):
                    end_date = dt.datetime.strptime(end_date, '%Y-%m-%d').date()
                
                days_until_expiry = (end_date - today).days
                is_active = days_until_expiry > 0
                status = 'Active' if is_active else 'Expired'
            else:
                days_until_expiry = 0
                status = 'No End Date'
            
            # Format dates
            start_date = member.membershipStartDate.strftime('%Y-%m-%d') if member.membershipStartDate else None
            end_date = member.membershipEndDate.strftime('%Y-%m-%d') if member.membershipEndDate else None
            
            membership_data = {
                'id': member.id,
                'type': plan.planName if plan else 'Unknown Plan',
                'planId': member.plan,
                'startDate': start_date,
                'expirationDate': end_date,
                'status': status,
                'isActive': is_active,
                'daysUntilExpiry': max(0, days_until_expiry),
                'memberId': member.golfClubId,
                'memberName': f"{member.firstName} {member.lastName}",
                'memberEmail': member.email
            }
            
            return Response({
                'code': 1,
                'message': 'Current memberships retrieved successfully',
                'data': [membership_data]  # Return as array for consistency
            })
            
        except MemberModel.DoesNotExist:
            logger.error("Current member not found")
            return Response({
                'code': 0,
                'message': 'Member profile not found'
            }, status=404)
        except Exception as e:
            logger.error(f"Error retrieving current memberships: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving memberships')
            }, status=500)




class AmenitiesViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
        'collection_amenities': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = AmenitiesModel.objects.filter(hideStatus=0)
    serializer_class = AmenitiesModelSerializers

    @action(detail=False, methods=['GET'])
    def collection_amenities(self, request):
        """Get all amenities formatted for collection component"""
        amenities = AmenitiesModel.objects.filter(hideStatus=0).order_by('id')
        serializer = AmenitiesModelSerializers(amenities, many=True, context={'request': request})
        
        # Format for frontend collection component
        formatted_amenities = []
        for amenity in serializer.data:
            formatted_amenities.append({
                'id': amenity['id'],
                'title': amenity['amenityName'],
                'tooltip': amenity['amenityTooltip'] or amenity['amenityName'],
                'icon_svg': amenity['amenity_icon_svg'],
                'icon_path': amenity['amenity_icon_path'],
                'viewbox': amenity['amenity_viewbox'],
            })
        
        return Response({
            'code': 1, 
            'data': formatted_amenities, 
            'message': "Amenities retrieved successfully"
        })

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = AmenitiesModelSerializers(
                AmenitiesModel.objects.filter(hideStatus=0).order_by('-id'),
                many=True,
                context={'request': request}
            )
        else:
            serializer = AmenitiesModelSerializers(
                AmenitiesModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                many=True,
                context={'request': request}
            )
        return Response({'code': 1, 'data': serializer.data, 'message': "All Retrieved"})

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == "0":
                serializer = AmenitiesModelSerializers(data=request.data, context={'request': request})
            else:
                instance = AmenitiesModel.objects.get(id=pk)
                serializer = AmenitiesModelSerializers(
                    instance=instance, 
                    data=request.data, 
                    context={'request': request}
                )
            
            if serializer.is_valid():
                serializer.save()
                return Response({'code': 1, 'message': "Done Successfully"})
            else:
                return Response({'code': 0, 'message': "Unable to Process Request", 'errors': serializer.errors})
        except AmenitiesModel.DoesNotExist:
            return Response({'code': 0, 'message': "Amenity not found"})
        except Exception as e:
            return Response({'code': 0, 'message': safe_error(e, 'Error processing request')})

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            AmenitiesModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Done Successfully"})
        except Exception as e:
            return Response({'code': 0, 'message': safe_error(e, 'Error deleting amenity')})


class CollectionViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """Optimized ViewSet for collection view with minimal data"""
    permission_map = {
        'list_courses': [AllowAny],
        'course_detail': [AllowAny],
        'search': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = CourseModel.objects.filter(hideStatus=0)
    serializer_class = CollectionSerializer

    def get_queryset(self):
        return CourseModel.objects.filter(hideStatus=0).prefetch_related('courseAmenities').order_by('-id')

    @action(detail=False, methods=['GET'])
    def list_courses(self, request):
        """Get courses formatted for the collection component - optimized response"""
        courses = self.get_queryset()
        
        # Use legacy serializer for backward compatibility with existing frontend
        use_legacy = request.query_params.get('legacy', 'false').lower() == 'true'
        
        if use_legacy:
            serializer = LegacyCollectionSerializer(courses, many=True, context={'request': request})
        else:
            serializer = CollectionSerializer(courses, many=True, context={'request': request})
        
        return Response({
            'code': 1, 
            'data': serializer.data, 
            'message': "Collection data retrieved successfully",
            'total': courses.count()
        })

    @action(detail=True, methods=['GET'])
    def course_detail(self, request, pk=None):
        """Get detailed course information for booking page"""
        try:
            course = CourseModel.objects.get(id=pk, hideStatus=0)
            serializer = CourseDetailSerializer(course, context={'request': request})
            
            return Response({
                'code': 1,
                'data': serializer.data,
                'message': "Course details retrieved successfully"
            })
        except CourseModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': "Course not found"
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['GET'])
    def search(self, request):
        """Search courses by name or location"""
        query = request.query_params.get('q', '')
        location = request.query_params.get('location', '')
        amenity_ids = request.query_params.getlist('amenities[]')

        queryset = self.get_queryset()

        if query:
            queryset = queryset.filter(courseName__icontains=query)
        
        if location:
            queryset = queryset.filter(
                models.Q(courseAddress__icontains=location) |
                models.Q(courseLocation__icontains=location)
            )
        
        if amenity_ids:
            queryset = queryset.filter(courseAmenities__id__in=amenity_ids).distinct()

        # Use legacy serializer for backward compatibility
        use_legacy = request.query_params.get('legacy', 'false').lower() == 'true'
        
        if use_legacy:
            serializer = LegacyCollectionSerializer(queryset, many=True, context={'request': request})
        else:
            serializer = CollectionSerializer(queryset, many=True, context={'request': request})
        
        return Response({
            'code': 1,
            'data': serializer.data,
            'message': "Search results retrieved",
            'total': queryset.count()
        })


class CourseManagementViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for course management (admin operations)"""
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = CourseModel.objects.filter(hideStatus=0)
    serializer_class = CourseDetailSerializer

    def get_queryset(self):
        return CourseModel.objects.filter(hideStatus=0).prefetch_related('courseAmenities').order_by('-id')

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            queryset = self.get_queryset()
        else:
            queryset = CourseModel.objects.filter(hideStatus=0, id=pk).prefetch_related('courseAmenities')

        serializer = CourseDetailSerializer(queryset, many=True, context={'request': request})
        return Response({'code': 1, 'data': serializer.data, 'message': "All Retrieved"})

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            instance = None if pk == "0" else CourseModel.objects.get(id=pk)

            # Handle both form data and JSON data
            if hasattr(request.data, 'dict'):
                data = request.data.dict()
            else:
                data = request.data.copy()

            # Parse amenities if it's a JSON string
            if 'courseAmenities' in data:
                if isinstance(data['courseAmenities'], str):
                    try:
                        data['courseAmenities'] = json.loads(data['courseAmenities'])
                    except json.JSONDecodeError:
                        data['courseAmenities'] = []
                elif isinstance(data['courseAmenities'], list):
                    # Ensure all items are integers
                    data['courseAmenities'] = [int(x) for x in data['courseAmenities'] if str(x).isdigit()]
                else:
                    data['courseAmenities'] = []
            else:
                data['courseAmenities'] = []

            # Handle legacy field names for backward compatibility
            if 'amenities' in data and 'courseAmenities' not in data:
                data['courseAmenities'] = data.pop('amenities')

            # Parse tees if it's a JSON string
            tees_data = []
            if 'tees' in data:
                if isinstance(data['tees'], str):
                    try:
                        tees_data = json.loads(data['tees'])
                    except json.JSONDecodeError:
                        tees_data = []
                else:
                    tees_data = data['tees']
                data.pop('tees')

            serializer = CourseCreateUpdateSerializer(
                instance=instance,
                data=data,
                context={'request': request}
            )

            if serializer.is_valid():
                course = serializer.save()
                
                # Handle amenities separately if provided
                if 'courseAmenities' in data:
                    course.courseAmenities.set(data['courseAmenities'])

                # Handle tee management
                if tees_data:
                    # Get existing tee IDs for this course
                    existing_tee_ids = set(TeeModel.objects.filter(
                        course=course, 
                        hideStatus=0
                    ).values_list('id', flat=True))
                    
                    # Process each tee
                    processed_tee_ids = set()
                    
                    for tee_data in tees_data:
                        if not isinstance(tee_data, dict):
                            continue
                            
                        tee_id = tee_data.get('id')
                        hole_number = tee_data.get('holeNumber')
                        
                        # Validate required fields
                        if not hole_number:
                            continue
                        
                        if tee_id and tee_id in existing_tee_ids:
                            # Update existing tee
                            try:
                                tee = TeeModel.objects.get(id=tee_id, course=course)
                                tee.holeNumber = int(hole_number)
                                tee.save()
                                processed_tee_ids.add(tee_id)
                            except (TeeModel.DoesNotExist, ValueError, TypeError):
                                continue
                        else:
                            # Create new tee
                            try:
                                new_tee = TeeModel.objects.create(
                                    course=course,
                                    holeNumber=int(hole_number)
                                )
                                processed_tee_ids.add(new_tee.id)
                            except (ValueError, TypeError):
                                continue
                    
                    # Delete tees that are no longer in the list
                    tees_to_delete = existing_tee_ids - processed_tee_ids
                    if tees_to_delete:
                        TeeModel.objects.filter(id__in=tees_to_delete).update(hideStatus=1)

                # Return the course data
                response_serializer = CourseDetailSerializer(course, context={'request': request})
                return Response({
                    'code': 1,
                    'message': "Done Successfully",
                    'data': response_serializer.data
                })
            else:
                return Response({
                    'code': 0,
                    'message': "Validation Error",
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except CourseModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': "Course not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            CourseModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Done Successfully"})
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class TeeViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
        'by_course': [AllowAny],
        'tee_info': [AllowAny],
    }
    default_permissions = [IsAdmin]
    serializer_class = TeeSerializer
    
    def get_queryset(self):
        queryset = TeeModel.objects.filter(hideStatus=0).select_related('course').order_by('holeNumber')
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset
    
    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            queryset = self.get_queryset()
        else:
            queryset = TeeModel.objects.filter(hideStatus=0, id=pk).select_related('course')
        
        serializer = TeeSerializer(queryset, many=True)
        return Response({'code': 1, 'data': serializer.data})
    
    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            instance = None if pk == "0" else TeeModel.objects.get(id=pk)
            serializer = TeeSerializer(instance=instance, data=request.data)
            
            if serializer.is_valid():
                tee = serializer.save()
                return Response({
                    'code': 1,
                    'message': "Tee processed successfully",
                    'data': TeeSerializer(tee).data
                })
            else:
                return Response({
                    'code': 0,
                    'message': "Validation Error",
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except TeeModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': "Tee not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            TeeModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Tee deleted successfully"})
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def by_course(self, request):
        """Get all tees for a specific course"""
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response({'error': 'course_id parameter required'}, status=400)
        
        tees = self.get_queryset().filter(course_id=course_id)
        serializer = self.get_serializer(tees, many=True)
        return Response({
            'code': 1,
            'data': serializer.data,
            'message': f'Tees retrieved successfully for course {course_id}'
        })
    
    @action(detail=True, methods=['get'])
    def tee_info(self, request, pk=None):
        """Get detailed information about a specific tee including its current bookings"""
        try:
            tee = self.get_object()
            
            # Get current date bookings for this tee
            from datetime import date
            today = date.today()
            
            current_bookings = BookingModel.objects.filter(
                tee=tee,
                slot_date=today,
                status__in=['confirmed', 'pending', 'completed'],
                is_join_request=False
            ).order_by('booking_time')
            
            # Calculate slot availability for today
            slots_info = []
            from datetime import time, timedelta
            
            # Course opening time (default 6:00 AM)
            open_time = time(6, 0)
            close_time = time(19, 0)  # 7:00 PM
            slot_duration = 8  # 8 minutes per slot
            
            current_time = open_time
            while current_time <= close_time:
                slot_time = current_time
                formatted_time = slot_time.strftime('%H:%M')  # Changed to 24-hour format
                
                # Get existing bookings for this slot and tee
                existing_bookings = current_bookings.filter(booking_time=slot_time)
                total_participants = sum(booking.participants for booking in existing_bookings)
                available_spots = 4 - total_participants
                
                # Determine slot status
                if total_participants == 0:
                    slot_status = 'available'
                elif total_participants < 4:
                    slot_status = 'partially_available'
                else:
                    slot_status = 'booked'
                
                slots_info.append({
                    'time': slot_time.strftime('%H:%M'),
                    'formatted_time': formatted_time,
                    'slot_status': slot_status,
                    'available_spots': available_spots,
                    'total_participants': total_participants,
                    'bookings': [
                        {
                            'member_name': f"{booking.member.firstName} {booking.member.lastName}",
                            'participants': booking.participants,
                            'status': booking.status
                        } for booking in existing_bookings
                    ]
                })
                
                # Move to next slot (8 minutes later)
                current_time = (datetime.combine(date.min, current_time) + timedelta(minutes=slot_duration)).time()
            
            tee_data = {
                'id': tee.id,
                'holeNumber': tee.holeNumber,
                'courseName': tee.course.courseName,
                'estimatedDuration': tee.estimated_duration,
                'today_slots': slots_info,
                'total_slots': len(slots_info),
                'available_slots': len([s for s in slots_info if s['slot_status'] != 'booked'])
            }
            
            return Response({
                'code': 1,
                'data': tee_data,
                'message': f'Tee information retrieved successfully for {tee.holeNumber} holes'
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving tee information')
            }, status=500)

class BookingViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'available_slots': [AllowAny],
        'admin_all_bookings': [IsAdmin],
    }
    default_permissions = [IsMember]
    serializer_class = BookingSerializer
    
    def get_queryset(self):
        """Bookings belonging to the authenticated member.

        Re-parsing the Authorization header here duplicated the work the
        authentication layer already did; the principal is authoritative.
        """
        member = resolve_member(self.request)
        if member is None:
            return BookingModel.objects.none()
        return BookingModel.objects.filter(
            member=member,
            hideStatus=0
        ).prefetch_related('tee__course').order_by('-createdAt')



    def list(self, request, *args, **kwargs):
        """Custom list method to handle single-slot bookings"""
        try:
            # Get the base queryset
            queryset = self.get_queryset()
            
            # Serialize the data
            serializer = self.get_serializer(queryset, many=True)
            bookings_data = serializer.data
            
            # Each booking represents a single slot
            return Response({
                'code': 1,
                'message': 'Bookings retrieved successfully',
                'data': bookings_data
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving bookings')
            }, status=500)

    def create(self, request, *args, **kwargs):
        """Create a new booking with automatic member assignment and booking ID generation"""
        try:
            # Get the authenticated member from the JWT token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'code': 0,
                    'message': 'Authorization header required'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import UntypedToken
            token_data = UntypedToken(token)
            member_id = token_data.get('member_id')
            
            if not member_id:
                return Response({
                    'code': 0,
                    'message': 'Invalid token - member_id not found'
                }, status=401)
            
            member = MemberModel.objects.get(id=member_id)
            
            # Add member to request data
            data = request.data.copy()
            data['member'] = member.id
            
            # Set status to 'confirmed' for direct bookings (non-join requests)
            if not data.get('is_join_request', False):
                data['status'] = 'confirmed'
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            # Create the booking
            booking = serializer.save()
            
            # If this is a join request, create notification for original booker
            if booking.is_join_request and booking.original_booking:
                original_booking = booking.original_booking
                NotificationModel.create_join_request_notification(
                    recipient=original_booking.member,
                    sender=member,
                    booking=original_booking,
                    join_request=booking
                )
            
            return Response({
                'code': 1,
                'message': 'Booking created successfully',
                'data': {
                    'id': booking.id,
                    'bookingId': booking.booking_id,
                    'courseName': booking.course.courseName,
                    'teeLabel': booking.get_tee_info(),
                    'date': booking.slot_date,
                    'participants': booking.participants,
                    'status': booking.status,
                    'isJoinRequest': booking.is_join_request
                }
            }, status=201)
            
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except DRFValidationError as e:
            # Surface the rule wording (e.g. the double-booking clash) as plain
            # text; str(e) would leak DRF's ErrorDetail repr to the member.
            return Response({
                'code': 0,
                'message': first_error_message(e) or 'Invalid booking details'
            }, status=400)
        except IntegrityError:
            # Lost a race to a concurrent booking for the same slot: the unique
            # constraint caught what the checks above could not.
            return Response({
                'code': 0,
                'message': BookingModel.member_clash_message()
            }, status=409)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=400)



    @action(detail=False, methods=['GET'], url_path='admin/all-bookings')
    def admin_all_bookings(self, request):
        """Admin endpoint to get all bookings across all members"""
        try:
            # Check if user is admin (you can implement your admin check logic here)
            # For now, we'll allow any authenticated user to access this
            
            # Get all bookings without member filtering
            all_bookings = BookingModel.objects.filter(
                hideStatus=0
            ).select_related(
                'member', 'course', 'tee'
            ).prefetch_related(
                'tee__course'
            ).order_by('-createdAt')
            
            # Serialize the data
            serializer = self.get_serializer(all_bookings, many=True)
            
            return Response({
                'code': 1,
                'message': 'All bookings retrieved successfully',
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving all bookings')
            }, status=500)

    @action(detail=True, methods=['post'])
    def approve_join_request(self, request, pk=None):
        """Approve a join request"""
        try:
            original_booking = self.get_object()
            join_request_id = request.data.get('join_request_id')
            
            if not join_request_id:
                return Response({
                    'code': 0,
                    'message': 'Join request ID is required'
                }, status=400)
            
            # Get the join request
            from apis.models import JoinRequestModel
            try:
                join_request = JoinRequestModel.objects.get(
                    id=join_request_id,
                    original_booking=original_booking,
                    status='pending_approval'
                )
            except JoinRequestModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Join request not found'
                }, status=404)

            # Enforce the course cut-off: expire instead of approving if the window passed
            if join_request.is_expired_now():
                join_request.status = 'expired'
                join_request.save(update_fields=['status', 'updatedAt'])
                NotificationModel.create_join_request_expired_notification(
                    recipient=join_request.member,
                    booking=original_booking,
                )
                return Response({
                    'code': 0,
                    'message': 'This request has expired and can no longer be approved.'
                }, status=400)

            # Check if slot can accommodate the join request
            total_participants = original_booking.participants + join_request.participants
            if total_participants > 4:
                return Response({
                    'code': 0,
                    'message': 'Slot cannot accommodate additional participants'
                }, status=400)

            # The requester may have booked elsewhere while this sat pending.
            clash = BookingModel.find_member_clash(
                join_request.member_id,
                original_booking.slot_date,
                original_booking.booking_time,
                exclude_join_request_id=join_request.id,
            )
            if clash:
                return Response({
                    'code': 0,
                    'message': (
                        f'{join_request.member.firstName} already has a booking at this '
                        f'date and time ({clash}), so this request can no longer be approved.'
                    )
                }, status=400)

            # Approve the join request and merge participants
            join_request.status = 'approved'
            join_request.approved_by = original_booking.member
            join_request.approved_at = timezone.now()
            join_request.save()
            
            # Merge participants into the original booking
            original_booking.participants = total_participants
            
            # Update original booking status if slot is now full
            if total_participants == 4:
                original_booking.status = 'completed'
            
            original_booking.save()
            
            # Create notification for the joining member
            NotificationModel.create_join_response_notification(
                recipient=join_request.member,
                sender=original_booking.member,
                booking=original_booking,
                is_approved=True
            )
            
            # Refresh the join request to get updated data
            join_request.refresh_from_db()
            
            return Response({
                'code': 1,
                'message': 'Join request approved successfully. Participants merged into existing booking.',
                'data': {
                    'joinRequestId': join_request.request_id,
                    'originalBookingId': original_booking.booking_id,
                    'originalBookingParticipants': original_booking.participants,
                    'joinRequestParticipants': join_request.participants,
                    'totalParticipants': original_booking.participants,
                    'status': join_request.status,
                    'isSlotFull': original_booking.participants >= 4,
                    'message': f'Successfully merged {join_request.participants} participant(s) into booking {original_booking.booking_id}'
                }
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=True, methods=['post'])
    def reject_join_request(self, request, pk=None):
        """Reject a join request"""
        try:
            original_booking = self.get_object()
            join_request_id = request.data.get('join_request_id')
            
            if not join_request_id:
                return Response({
                    'code': 0,
                    'message': 'Join request ID is required'
                }, status=400)
            
            # Get the join request
            from apis.models import JoinRequestModel
            try:
                join_request = JoinRequestModel.objects.get(
                    id=join_request_id,
                    original_booking=original_booking,
                    status='pending_approval'
                )
            except JoinRequestModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Join request not found'
                }, status=404)
            
            # Reject the join request
            join_request.status = 'rejected'
            join_request.save()
            
            # Create notification for the joining member
            NotificationModel.create_join_response_notification(
                recipient=join_request.member,
                sender=original_booking.member,
                booking=original_booking,
                is_approved=False
            )
            
            return Response({
                'code': 1,
                'message': 'Join request rejected successfully'
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=False, methods=['post'])
    def create_multi_slot_booking(self, request):
        """Create one booking per slot for different time slots/tees.

        Enforces the one-slot-per-time rule: two slots that share the same
        date + time (even on different tees/courses) are rejected, and the
        BookingSerializer additionally blocks clashes with existing bookings.
        The whole batch is atomic - if any slot is invalid, nothing is saved.
        """
        from datetime import datetime
        from django.db import transaction

        try:
            member = MemberModel.objects.get(email=request.user.email)

            slots_data = request.data.get('slots', [])
            if not slots_data or not isinstance(slots_data, list):
                return Response({
                    'code': 0,
                    'message': 'Slots data is required and must be a list'
                }, status=400)

            # --- Parse + validate every slot up front (no writes yet) ---
            parsed_slots = []
            seen_times = {}  # (date, time) -> slot index, to catch same-time duplicates
            for i, slot_data in enumerate(slots_data):
                for field in ['course', 'tee', 'participants']:
                    if field not in slot_data:
                        return Response({
                            'code': 0,
                            'message': f'Slot {i + 1}: Missing required field: {field}'
                        }, status=400)

                slot_date = slot_data.get('slotDate') or slot_data.get('bookingDate')
                booking_time = slot_data.get('bookingTime')
                if not slot_date or not booking_time:
                    return Response({
                        'code': 0,
                        'message': f'Slot {i + 1}: slotDate/bookingDate and bookingTime are required'
                    }, status=400)

                if isinstance(slot_date, str):
                    try:
                        slot_date = datetime.strptime(slot_date, '%Y-%m-%d').date()
                    except ValueError:
                        return Response({
                            'code': 0,
                            'message': f'Slot {i + 1}: Invalid date format. Expected YYYY-MM-DD'
                        }, status=400)
                if isinstance(booking_time, str):
                    try:
                        booking_time = datetime.strptime(booking_time, '%H:%M').time()
                    except ValueError:
                        return Response({
                            'code': 0,
                            'message': f'Slot {i + 1}: Invalid time format. Expected HH:MM'
                        }, status=400)

                # Validate tee exists
                if not TeeModel.objects.filter(id=slot_data['tee']).exists():
                    return Response({
                        'code': 0,
                        'message': f'Slot {i + 1}: Tee with ID {slot_data["tee"]} not found'
                    }, status=400)

                # One slot per time: reject two selections at the same date + time
                time_key = (slot_date, booking_time)
                if time_key in seen_times:
                    return Response({
                        'code': 0,
                        'message': (
                            f'You selected more than one tee for {slot_date} at '
                            f'{booking_time.strftime("%H:%M")}. You can only book one tee per time slot.'
                        )
                    }, status=400)
                seen_times[time_key] = i

                parsed_slots.append({
                    'course': slot_data['course'],
                    'tee': slot_data['tee'],
                    'slot_date': slot_date,
                    'booking_time': booking_time,
                    'participants': slot_data['participants'],
                })

            # --- Create one booking per slot atomically ---
            created_bookings = []
            total_participants = 0
            with transaction.atomic():
                for i, slot in enumerate(parsed_slots):
                    booking_data = {
                        'member': member.id,
                        'course': slot['course'],
                        'tee': slot['tee'],
                        'slot_date': slot['slot_date'],
                        'booking_time': slot['booking_time'],
                        'participants': slot['participants'],
                        'status': 'confirmed',
                    }
                    serializer = self.get_serializer(data=booking_data)
                    if not serializer.is_valid():
                        # Surface the first validation error (e.g. overlapping-time clash)
                        raise ValueError(
                            f'Slot {i + 1}: {first_error_message(serializer.errors) or "Invalid booking details"}'
                        )
                    created_bookings.append(serializer.save())
                    total_participants += slot['participants']

                # Link every booking in the batch to the first one's ID
                main_booking = created_bookings[0]
                group_id = main_booking.booking_id
                for booking in created_bookings:
                    booking.group_id = group_id
                    booking.save(update_fields=['group_id'])

            # --- Build response ---
            booking_data = self.get_serializer(main_booking).data
            slot_booking_details = []
            for slot_booking in created_bookings:
                slot_details = self.get_serializer(slot_booking).data
                slot_details['created_at'] = slot_booking.createdAt.isoformat() if slot_booking.createdAt else None
                slot_details['formatted_created_date'] = slot_booking.createdAt.strftime('%d-%b-%Y') if slot_booking.createdAt else 'N/A'
                slot_booking_details.append(slot_details)

            return Response({
                'code': 1,
                'message': 'Multi-slot booking created successfully',
                'data': {
                    'booking': booking_data,
                    'singleBookingId': main_booking.booking_id,
                    'totalSlots': len(created_bookings),
                    'totalParticipants': total_participants,
                    'slotBookings': slot_booking_details,
                    'individualBookingIds': [slot.booking_id for slot in created_bookings]
                }
            })

        except ValueError as ve:
            # Validation failure raised inside the atomic block (batch rolled back)
            return Response({
                'code': 0,
                'message': str(ve)
            }, status=400)
        except IntegrityError:
            # Lost a race to a concurrent booking for the same slot: the unique
            # constraint caught what the checks above could not.
            return Response({
                'code': 0,
                'message': BookingModel.member_clash_message()
            }, status=409)
        except Exception as e:
            import traceback
            logger.exception('Unhandled error')
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error creating multi-slot booking')
            }, status=500)

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        """Get available time slots for a course, date, and specific tee"""
        try:
            course_id = request.query_params.get('course_id')
            date_str = request.query_params.get('date')
            tee_id = request.query_params.get('tee_id')
            participants = int(request.query_params.get('participants', 1))
            # Remove timezone_offset parameter as we now use UK time directly
            
            if not all([course_id, date_str, tee_id]):
                return Response({
                    'code': 0,
                    'message': 'Course ID, date, and tee ID are required'
                }, status=400)
            
            # Parse date
            from datetime import datetime
            booking_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Get course and specific tee
            try:
                course = CourseModel.objects.get(id=course_id, hideStatus=0)
                tee = TeeModel.objects.get(id=tee_id, course=course, hideStatus=0)
            except (CourseModel.DoesNotExist, TeeModel.DoesNotExist):
                return Response({
                    'code': 0,
                    'message': 'Course or tee not found'
                }, status=404)
            
            # Generate time slots specifically for this tee (using UK time)
            slots = self.generate_time_slots(course, booking_date, tee, participants)
            
            
            # Add tee information to the response for clarity
            response_data = {
                'course_id': course_id,
                'course_name': course.courseName,
                'tee_id': tee_id,
                'tee_holes': tee.holeNumber,
                'date': date_str,
                'participants': participants,
                'slots': slots,
                'total_slots': len(slots)
            }
            
            
            return Response({
                'code': 1,
                'message': f'Time slots retrieved successfully for {tee.holeNumber} holes tee',
                'data': response_data
            })
            
        except Exception as e:
            import traceback
            logger.exception('Unhandled error')
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=400)

    def generate_time_slots(self, course, booking_date, tee, requested_participants):
        """Generate time slots dynamically based on course opening time and slot duration for a specific tee"""
        from datetime import datetime, time, timedelta
        from django.utils import timezone
        
        # Course opening time (default 6:00 AM)
        open_time = course.courseOpenFrom or time(6, 0)
        close_time = time(19, 0)  # 7:00 PM
        slot_duration = 8  # 8 minutes per slot
        
        slots = []
        # Make current_time timezone-aware
        current_time = timezone.make_aware(datetime.combine(booking_date, open_time))
        end_datetime = timezone.make_aware(datetime.combine(booking_date, close_time))
        
        # Only for today, start from current time rounded to next slot (using UK time)
        uk_now = timezone.now().astimezone(UK_TIMEZONE)
        if booking_date == uk_now.date():
            # Use UK time directly - no need for timezone offset adjustment
            now = uk_now
                
            if current_time < now:
                # Round up to next 8-minute slot
                minutes_since_open = (now - timezone.make_aware(datetime.combine(booking_date, open_time))).total_seconds() / 60
                slots_since_open = int(minutes_since_open / slot_duration) + 1
                current_time = timezone.make_aware(datetime.combine(booking_date, open_time)) + timedelta(minutes=slots_since_open * slot_duration)
                
                # Ensure we don't start before the open time
                if current_time.time() < open_time:
                    current_time = timezone.make_aware(datetime.combine(booking_date, open_time))
                
        else:
            # For all future dates (including tomorrow), start from the course opening time
            current_time = timezone.make_aware(datetime.combine(booking_date, open_time))
        
        while current_time.time() <= close_time:
            slot_time = current_time.time()
            formatted_time = slot_time.strftime('%H:%M')  # Changed to 24-hour format
            
            # Get existing bookings for this specific slot, date, and tee using the new single-slot approach
            try:
                existing_bookings = BookingModel.objects.filter(
                    tee=tee,
                    slot_date=booking_date,
                    booking_time=slot_time,
                    status__in=['pending', 'confirmed', 'completed'],
                    is_join_request=False,  # Only count original bookings, not join requests
                    hideStatus=0
                )
            except Exception as query_error:
                logger.error(f"Error in booking query: {query_error}")
                import traceback
                logger.error(f"Query traceback: {traceback.format_exc()}")
                existing_bookings = BookingModel.objects.none()
            
            # Calculate total participants in this slot for this specific tee
            total_participants = sum(booking.participants for booking in existing_bookings)
            available_spots = 4 - total_participants
            
            # Determine slot status
            if total_participants == 0:
                slot_status = 'available'
            elif total_participants < 4:
                slot_status = 'partially_available'
            else:
                slot_status = 'booked'
            
            # Only show slots that can accommodate the requested participants
            can_accommodate = available_spots >= requested_participants
            
            if can_accommodate and slot_status != 'booked':
                # Get booking details for partially available slots
                booking_details = []
                if existing_bookings.exists():
                    for booking in existing_bookings:
                        # Check if tee exists before accessing holeNumber
                        hole_number = booking.tee.holeNumber if booking.tee else None
                        display_name = f"{booking.member.firstName} {booking.member.lastName}"
                        if not request.user.is_authenticated:
                            display_name = "Member"
                        booking_details.append({
                            'booking_id': booking.booking_id,
                            'member_name': display_name,
                            'participants': booking.participants,
                            'status': booking.status,
                            'hole_number': hole_number,
                            'start_time': booking.booking_time.strftime('%H:%M'),  # Changed to 24-hour format
                            'end_time': booking.end_time.strftime('%H:%M')  # Changed to 24-hour format
                        })
                
                slot_data = {
                    'time': slot_time.strftime('%H:%M'),
                    'available': True,
                    'formatted_time': formatted_time,
                    'slot_status': slot_status,
                    'available_spots': available_spots,
                    'total_participants': total_participants,
                    'bookings': booking_details,
                    'booking_count': len(booking_details),
                    'tee_id': tee.id,  # Add tee ID to identify which tee this slot belongs to
                    'tee_holes': tee.holeNumber,  # Add hole count for clarity
                    'tee_name': f"{tee.holeNumber} Holes",  # Add exact tee name for display
                    'slot_date': booking_date.strftime('%Y-%m-%d'),  # Add slot date in YYYY-MM-DD format
                    'formatted_slot_date': booking_date.strftime('%d/%B/%Y')  # Add formatted slot date for display
                }
                
                slots.append(slot_data)
            
            # Move to next slot (8 minutes later)
            current_time += timedelta(minutes=slot_duration)
        
        return slots

    @action(detail=True, methods=['post'], url_path='add_participants', url_name='add_participants')
    def add_participants(self, request, pk=None):
        """Add participants to an existing booking"""
        try:
            
            # Get the authenticated member from the JWT token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'code': 0,
                    'message': 'Authorization header required'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import UntypedToken
            token_data = UntypedToken(token)
            member_id = token_data.get('member_id')
            
            if not member_id:
                return Response({
                    'code': 0,
                    'message': 'Invalid token - member_id not found'
                }, status=401)
            
            member = MemberModel.objects.get(id=member_id)
            
            # Get the booking object directly by ID
            try:
                booking = get_object_or_404(BookingModel, id=pk, hideStatus=0)
            except Exception as e:
                logger.exception('Unhandled error')
                return Response({
                    'code': 0,
                    'message': safe_error(e, 'Error getting booking')
                }, status=500)
            
            # Check if the authenticated user owns this booking
            if booking.member.id != member.id:
                return Response({
                    'code': 0,
                    'message': 'You can only add participants to your own bookings'
                }, status=403)
            
            additional_participants = request.data.get('additional_participants', 1)
            
            if not additional_participants or additional_participants <= 0:
                return Response({
                    'code': 0,
                    'message': 'Additional participants must be greater than 0'
                }, status=400)
            
            # Check if slot can accommodate more participants
            total_participants = booking.participants + additional_participants
            if total_participants > 4:
                return Response({
                    'code': 0,
                    'message': f'Cannot add {additional_participants} participants. Maximum 4 participants allowed.'
                }, status=400)
            
            # Update booking with new participant count
            old_participants = booking.participants
            booking.participants = total_participants
            booking.save()
            
            
            return Response({
                'code': 1,
                'message': f'Successfully added {additional_participants} participants',
                'data': {
                    'bookingId': booking.booking_id,
                    'newTotalParticipants': total_participants,
                    'previousParticipants': old_participants
                }
            })
            
        except Exception as e:
            logger.exception('Unhandled error')
            import traceback
            traceback.print_exc()
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error adding participants')
            }, status=500)

    @action(detail=False, methods=['post'])
    def create_join_request(self, request):
        """Create a join request for a partially available slot"""
        try:
            # Get the authenticated member from the JWT token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'code': 0,
                    'message': 'Authorization header required'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import UntypedToken
            token_data = UntypedToken(token)
            member_id = token_data.get('member_id')
            
            if not member_id:
                return Response({
                    'code': 0,
                    'message': 'Invalid token - member_id not found'
                }, status=401)
            
            member = MemberModel.objects.get(id=member_id)
            
            # Get request data
            course_id = request.data.get('course')
            tee_id = request.data.get('tee')
            slot_date = request.data.get('slotDate')
            booking_time = request.data.get('bookingTime')
            participants = request.data.get('participants', 1)
            original_slot_participants = request.data.get('originalSlotParticipants', 0)
            
            # Validate required fields
            if not all([course_id, tee_id, slot_date, booking_time, participants]):
                return Response({
                    'code': 0,
                    'message': 'Course, tee, slot date, booking time, and participants are required'
                }, status=400)
            
            # Convert date string to date object
            if isinstance(slot_date, str):
                try:
                    from datetime import datetime
                    slot_date = datetime.strptime(slot_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'code': 0,
                        'message': 'Invalid date format. Expected YYYY-MM-DD'
                    }, status=400)
            
            # Convert time string to time object
            if isinstance(booking_time, str):
                try:
                    from datetime import datetime
                    booking_time = datetime.strptime(booking_time, '%H:%M').time()
                except ValueError:
                    return Response({
                        'code': 0,
                        'message': 'Invalid time format. Expected HH:MM'
                    }, status=400)
            
            # Find the original booking for this slot
            try:
                original_booking = BookingModel.objects.get(
                    course_id=course_id,
                    tee_id=tee_id,
                    slot_date=slot_date,
                    booking_time=booking_time,
                    status='confirmed',
                    is_join_request=False,
                    hideStatus=0
                )
            except BookingModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'No confirmed booking found for this slot'
                }, status=404)
            
            # Check if this is the user's own booking
            if original_booking.member.id == member.id:
                return Response({
                    'code': 0,
                    'message': 'Cannot create join request for your own booking'
                }, status=400)
            
            # Check if slot can accommodate the join request
            total_participants = original_booking.participants + participants
            if total_participants > 4:
                return Response({
                    'code': 0,
                    'message': f'Slot cannot accommodate {participants} additional participants. Maximum 4 participants allowed.'
                }, status=400)

            # A member already committed at this date + time cannot join another
            # club's slot at the same time.
            clash = BookingModel.find_member_clash(member.id, slot_date, booking_time)
            if clash:
                return Response({
                    'code': 0,
                    'message': BookingModel.member_clash_message(clash)
                }, status=400)
            
            # Check if there's already a pending or approved join request from this member
            from apis.models import JoinRequestModel
            existing_request = JoinRequestModel.objects.filter(
                member=member,
                original_booking=original_booking,
                status__in=['pending_approval', 'approved'],
                hideStatus=0
            ).first()
            
            if existing_request:
                # Return success response with existing request info for confirmation modal
                return Response({
                    'code': 1,
                    'message': 'You already have a request for this slot',
                    'data': {
                        'type': 'existing_request',
                        'existingRequestId': existing_request.request_id,
                        'existingStatus': existing_request.status,
                        'existingParticipants': existing_request.participants,
                        'originalBookingId': original_booking.booking_id,
                        'slotDate': original_booking.slot_date.strftime('%Y-%m-%d') if original_booking.slot_date else None,
                        'bookingTime': original_booking.booking_time.strftime('%H:%M') if original_booking.booking_time else None,
                        'courseName': original_booking.course.courseName if original_booking.course else None,
                        'teeInfo': f"{original_booking.tee.holeNumber} Holes" if original_booking.tee else None
                    }
                })
            
            # Create the join request using the new JoinRequestModel
            from apis.models import JoinRequestModel
            
            join_request = JoinRequestModel.objects.create(
                member=member,
                original_booking=original_booking,
                participants=participants
            )
            
            # Create notification for the original booker
            NotificationModel.create_join_request_notification(
                recipient=original_booking.member,
                sender=member,
                booking=original_booking,
                join_request=join_request
            )
            
            return Response({
                'code': 1,
                'message': 'Join request created successfully',
                'data': {
                    'id': join_request.id,
                    'requestId': join_request.request_id,
                    'courseName': original_booking.course.courseName,
                    'teeLabel': f"{original_booking.tee.holeNumber} Holes" if original_booking.tee else "Tee not specified",
                    'date': original_booking.slot_date,
                    'time': original_booking.booking_time,
                    'participants': join_request.participants,
                    'status': join_request.status,
                    'originalBookingId': original_booking.booking_id,
                    'originalBookingParticipants': original_booking.participants
                }
            }, status=201)
            
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=False, methods=['GET'])
    def check_slot_availability(self, request):
        """Check slot availability and existing requests for a specific slot"""
        try:
            # Get the authenticated member from the JWT token
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({
                    'code': 0,
                    'message': 'Authorization header required'
                }, status=401)
            
            token = auth_header.split(' ')[1]
            from rest_framework_simplejwt.tokens import UntypedToken
            token_data = UntypedToken(token)
            member_id = token_data.get('member_id')
            
            if not member_id:
                return Response({
                    'code': 0,
                    'message': 'Invalid token - member_id not found'
                }, status=401)
            
            member = MemberModel.objects.get(id=member_id)
            
            # Get query parameters
            course_id = request.query_params.get('course')
            tee_id = request.query_params.get('tee')
            slot_date = request.query_params.get('slotDate')
            booking_time = request.query_params.get('bookingTime')
            
            if not all([course_id, tee_id, slot_date, booking_time]):
                return Response({
                    'code': 0,
                    'message': 'Course, tee, slot date, and booking time are required'
                }, status=400)
            
            # Convert date string to date object
            if isinstance(slot_date, str):
                try:
                    from datetime import datetime
                    slot_date = datetime.strptime(slot_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'code': 0,
                        'message': 'Invalid date format. Expected YYYY-MM-DD'
                    }, status=400)
            
            # Convert time string to time object
            if isinstance(booking_time, str):
                try:
                    from datetime import datetime
                    booking_time = datetime.strptime(booking_time, '%H:%M').time()
                except ValueError:
                    return Response({
                        'code': 0,
                        'message': 'Invalid time format. Expected HH:MM'
                    }, status=400)
            
            # Find the original booking for this slot
            try:
                original_booking = BookingModel.objects.get(
                    course_id=course_id,
                    tee_id=tee_id,
                    slot_date=slot_date,
                    booking_time=booking_time,
                    status='confirmed',
                    is_join_request=False,
                    hideStatus=0
                )
            except BookingModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'No confirmed booking found for this slot'
                }, status=404)
            
            # Check if this is the user's own booking
            is_own_booking = original_booking.member.id == member.id
            
            # Get existing join requests for this slot
            existing_requests = BookingModel.objects.filter(
                original_booking=original_booking,
                is_join_request=True,
                status__in=['pending_approval', 'approved'],
                hideStatus=0
            )
            
            # Calculate available spots
            total_booked_participants = original_booking.participants
            total_requested_participants = sum(req.participants for req in existing_requests if req.status == 'approved')
            available_spots = 4 - total_booked_participants - total_requested_participants
            
            # Check if user has existing request
            user_existing_request = None
            if not is_own_booking:
                user_existing_request = existing_requests.filter(
                    member=member,
                    status='pending_approval'
                ).first()
            
            # Determine what actions user can take
            can_add_participants = is_own_booking and available_spots > 0
            can_join_request = not is_own_booking and available_spots > 0 and not user_existing_request
            
            return Response({
                'code': 1,
                'message': 'Slot availability checked successfully',
                'data': {
                    'slotId': original_booking.id,
                    'courseName': original_booking.course.courseName,
                    'teeHoles': original_booking.tee.holeNumber if original_booking.tee else None,
                    'slotDate': slot_date.strftime('%Y-%m-%d'),
                    'bookingTime': booking_time.strftime('%H:%M'),
                    'originalBooker': {
                        'id': original_booking.member.id,
                        'name': f"{original_booking.member.firstName} {original_booking.member.lastName}"
                    },
                    'isOwnBooking': is_own_booking,
                    'originalParticipants': original_booking.participants,
                    'approvedJoinRequests': [
                        {
                            'memberName': f"{req.member.firstName} {req.member.lastName}",
                            'participants': req.participants
                        } for req in existing_requests if req.status == 'approved'
                    ],
                    'pendingJoinRequests': [
                        {
                            'memberName': f"{req.member.firstName} {req.member.lastName}",
                            'participants': req.participants
                        } for req in existing_requests if req.status == 'pending_approval'
                    ],
                    'availableSpots': available_spots,
                    'canAddParticipants': can_add_participants,
                    'canJoinRequest': can_join_request,
                    'userExistingRequest': {
                        'id': user_existing_request.id,
                        'status': user_existing_request.status,
                        'participants': user_existing_request.participants,
                        'message': 'You already have a request for this slot'
                    } if user_existing_request else None
                }
            })
            
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error checking slot availability')
            }, status=500)

    @action(detail=True, methods=['post'])
    def review_join_request(self, request, pk=None):
        """Review and approve/reject a join request"""
        try:
            # pk is the join request ID, not the original booking ID
            join_request = get_object_or_404(BookingModel, id=pk, is_join_request=True, hideStatus=0)
            
            action = request.data.get('action')
            
            if action not in ['approve', 'reject']:
                return Response({
                    'code': 0,
                    'message': 'Action must be either "approve" or "reject"'
                }, status=400)
            
            # Get the original booking from the join request
            original_booking = join_request.original_booking
            if not original_booking:
                return Response({
                    'code': 0,
                    'message': 'Join request has no associated original booking'
                }, status=400)
            
            # Get the authenticated member from the JWT token
            try:
                # Extract member_id from JWT token
                auth_header = request.headers.get('Authorization', '')
                if not auth_header.startswith('Bearer '):
                    return Response({
                        'code': 0,
                        'message': 'Authorization header required'
                    }, status=401)
                
                token = auth_header.split(' ')[1]
                from rest_framework_simplejwt.tokens import UntypedToken
                token_data = UntypedToken(token)
                member_id = token_data.get('member_id')
                
                if not member_id:
                    return Response({
                        'code': 0,
                        'message': 'Invalid token - member_id not found'
                    }, status=401)
                
                member = MemberModel.objects.get(id=member_id)
            except Exception as e:
                return Response({
                    'code': 0,
                    'message': 'Authentication failed'
                }, status=401)
            
            # Check if this is the original booker
            if original_booking.member.id != member.id:
                return Response({
                    'code': 0,
                    'message': 'Only the original booker can review join requests'
                }, status=403)
            
            # Verify the join request is still pending
            if join_request.status != 'pending_approval':
                return Response({
                    'code': 0,
                    'message': 'Join request is not in pending status'
                }, status=400)
            
            if action == 'approve':
                # Approve the join request
                success = original_booking.approve_join_request(join_request_id, original_booking.member)
                
                if success:
                    # Create approval notification
                    NotificationModel.create_join_response_notification(
                        recipient=join_request.member,
                        sender=original_booking.member,
                        booking=original_booking,
                        is_approved=True
                    )
                    
                    return Response({
                        'code': 1,
                        'message': 'Join request approved successfully',
                        'data': {
                            'action': 'approved',
                            'joinRequestId': join_request.id,
                            'originalBookingId': original_booking.id,
                            'newTotalParticipants': original_booking.participants,
                            'allParticipantsInfo': original_booking.get_all_participants_info()
                        }
                    })
                else:
                    return Response({
                        'code': 0,
                        'message': 'Failed to approve join request'
                    }, status=400)
            else:
                # Reject the join request
                success = original_booking.reject_join_request(join_request_id)
                
                if success:
                    # Create rejection notification
                    NotificationModel.create_join_response_notification(
                        recipient=join_request.member,
                        sender=original_booking.member,
                        booking=original_booking,
                        is_approved=False
                    )
                    
                    return Response({
                        'code': 1,
                        'message': 'Join request rejected successfully',
                        'data': {
                            'action': 'rejected',
                            'joinRequestId': join_request.id
                        }
                    })
                else:
                    return Response({
                        'code': 0,
                        'message': 'Failed to reject join request'
                    }, status=400)
                    
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error reviewing join request')
            }, status=500)


class DashboardViewSet(ActionPermissionMixin, viewsets.ViewSet):
    """Live club figures for the admin dashboard.

    Every number is counted at request time, so polling this endpoint is what
    makes the dashboard current. Dates use UK time to match the booking rules.
    """
    default_permissions = [IsAdmin]

    @action(detail=False, methods=['GET'], url_path='stats')
    def stats(self, request):
        try:
            uk_now = timezone.now().astimezone(UK_TIMEZONE)
            today = uk_now.date()
            month_start = today.replace(day=1)

            # Use timestamp ranges instead of createdAt__date. The latter asks
            # MySQL to run CONVERT_TZ(), which returns NULL when its timezone
            # tables are not installed and makes valid bookings disappear.
            def uk_day_range(day):
                start = UK_TIMEZONE.localize(dt.datetime.combine(day, dt.time.min))
                end = UK_TIMEZONE.localize(dt.datetime.combine(
                    day + dt.timedelta(days=1), dt.time.min
                ))
                return start, end

            month_start_at = UK_TIMEZONE.localize(
                dt.datetime.combine(month_start, dt.time.min)
            )
            if month_start.month == 12:
                next_month = month_start.replace(
                    year=month_start.year + 1, month=1
                )
            else:
                next_month = month_start.replace(month=month_start.month + 1)
            next_month_at = UK_TIMEZONE.localize(
                dt.datetime.combine(next_month, dt.time.min)
            )

            live_bookings = BookingModel.objects.filter(
                hideStatus=0, is_join_request=False,
                status__in=BookingModel.ACTIVE_STATUSES,
            )

            recent = live_bookings.select_related('member', 'course', 'tee').order_by('-createdAt')[:5]
            recent_bookings = [{
                'bookingId': b.booking_id,
                'memberName': f"{b.member.firstName} {b.member.lastName}".strip() if b.member else 'Unknown',
                'courseName': b.course.courseName if b.course else 'Unknown',
                'teeInfo': f"{b.tee.holeNumber} Holes" if b.tee else '-',
                'slotDate': b.slot_date.isoformat() if b.slot_date else None,
                'bookingTime': b.booking_time.strftime('%H:%M') if b.booking_time else None,
                'participants': b.participants,
                'status': b.status,
            } for b in recent]

            # Bookings created on each of the last 7 days, oldest first
            trend = []
            for offset in range(6, -1, -1):
                day = today - dt.timedelta(days=offset)
                day_start, day_end = uk_day_range(day)
                trend.append({
                    'date': day.isoformat(),
                    'label': day.strftime('%a'),
                    'count': live_bookings.filter(
                        createdAt__gte=day_start,
                        createdAt__lt=day_end,
                    ).count(),
                })

            return Response({
                'code': 1,
                'message': 'Dashboard stats retrieved successfully',
                'data': {
                    'generatedAt': timezone.now().astimezone(UK_TIMEZONE).isoformat(),
                    'members': {
                        'total': MemberModel.objects.filter(hideStatus=0).count(),
                        'newThisMonth': MemberModel.objects.filter(
                            hideStatus=0,
                            createdAt__gte=month_start_at,
                            createdAt__lt=next_month_at,
                        ).count(),
                    },
                    'bookings': {
                        'today': live_bookings.filter(slot_date=today).count(),
                        'upcoming': live_bookings.filter(slot_date__gt=today).count(),
                        'thisMonth': live_bookings.filter(slot_date__gte=month_start).count(),
                        'total': live_bookings.count(),
                    },
                    'joinRequests': {
                        'pending': JoinRequestModel.objects.filter(
                            hideStatus=0, status='pending_approval').count(),
                    },
                    'courses': {
                        'active': CourseModel.objects.filter(hideStatus=0).count(),
                        'tees': TeeModel.objects.filter(hideStatus=0).count(),
                    },
                    'enquiries': {
                        'contact': ContactEnquiryModel.objects.filter(hideStatus=0).count(),
                        'member': MemberEnquiryModel.objects.filter(hideStatus=0).count(),
                    },
                    'recentBookings': recent_bookings,
                    'bookingsTrend': trend,
                }
            })
        except Exception as e:
            logger.error(f"Error building dashboard stats: {str(e)}")
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving dashboard stats')
            }, status=500)


class NotificationViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing notifications"""
    default_permissions = [IsMember]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        queryset = NotificationModel.objects.select_related('recipient', 'sender', 'related_booking')
        
        # Filter by current member if authenticated
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            try:
                member = MemberModel.objects.get(email=self.request.user.email)
                queryset = queryset.filter(recipient=member)
            except MemberModel.DoesNotExist:
                queryset = queryset.none()
        
        return queryset
    
    @action(detail=False, methods=['GET'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        try:
            if hasattr(request, 'user') and request.user.is_authenticated:
                member = MemberModel.objects.get(email=request.user.email)
                count = NotificationModel.objects.filter(
                    recipient=member,
                    is_read=False,
                    hideStatus=0
                ).count()
                
                return Response({
                    'code': 1,
                    'data': {'unread_count': count},
                    'message': 'Unread count retrieved successfully'
                })
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=400)
    
    @action(detail=True, methods=['POST'])
    def mark_as_read(self, request, pk=None):
        """Mark notification as read"""
        try:
            notification = self.get_object()
            notification.mark_as_read()
            
            return Response({
                'code': 1,
                'data': NotificationSerializer(notification).data,
                'message': 'Notification marked as read'
            })
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error marking notification as read')
            }, status=400)
    
    @action(detail=False, methods=['POST'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        try:
            if hasattr(request, 'user') and request.user.is_authenticated:
                member = MemberModel.objects.get(email=request.user.email)
                NotificationModel.objects.filter(
                    recipient=member,
                    is_read=False,
                    hideStatus=0
                ).update(is_read=True)
                
                return Response({
                    'code': 1,
                    'message': 'All notifications marked as read'
                })
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=400)

    @action(detail=False, methods=['GET'])
    def header(self, request):
        """Get notifications for header display (limited count)"""
        try:
            if hasattr(request, 'user') and request.user.is_authenticated:
                member = MemberModel.objects.get(email=request.user.email)
                
                # Get recent unread notifications (limit to 5)
                notifications = NotificationModel.objects.filter(
                    recipient=member,
                    is_read=False,
                    hideStatus=0
                ).order_by('-createdAt')[:5]
                
                # Get total unread count
                unread_count = NotificationModel.objects.filter(
                    recipient=member,
                    is_read=False,
                    hideStatus=0
                ).count()
                
                serializer = NotificationSerializer(notifications, many=True)
                
                return Response({
                    'code': 1,
                    'data': {
                        'notifications': serializer.data,
                        'unread_count': unread_count
                    },
                    'message': 'Header notifications retrieved successfully'
                })
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=400)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving header notifications')
            }, status=500)


class BlogViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'latest': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = BlogModel.objects.filter(hideStatus=0)
    serializer_class = BlogModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = BlogModelSerializers(BlogModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = BlogModelSerializers(BlogModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                              many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=False, url_path='latest/(?P<count>[^/.]+)', methods=['GET'])
    def latest(self, request, count=5):
        """
        Get the latest blog posts (news items)
        /api/blog/latest/5/ will return the 5 most recent blog posts
        """
        try:
            count = int(count)
            if count <= 0:
                count = 5  # Default to 5 if invalid count
        except ValueError:
            count = 5  # Default to 5 if count is not a number
            
        # Get the latest blogs by date and ID
        blogs = BlogModel.objects.filter(hideStatus=0).order_by('-blogDate', '-id')[:count]
        serializer = BlogModelSerializers(blogs, many=True)
        
        response = {'code': 1, 'data': serializer.data, 'message': f"Latest {count} news retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = BlogModelSerializers(data=request.data)
        else:
            serializer = BlogModelSerializers(instance=BlogModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        BlogModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class ConceptViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'get_concept': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = ConceptModel.objects.all()
    serializer_class = ConceptModelSerializer

    @action(detail=False, methods=['GET'], url_path='get_concept')
    def get_concept(self, request):
        """Get the single concept instance"""
        try:
            instance = ConceptModel.get_solo()
            serializer = ConceptModelSerializer(instance)
            return Response({
                'code': 1,
                'data': serializer.data,
                'message': "Retrieved Successfully"
            })
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Request failed')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'], url_path='create_or_update_concept')
    def create_or_update_concept(self, request):
        """Create or update the concept with items"""
        try:
            with transaction.atomic():
                # Get singleton instance
                instance = ConceptModel.get_solo()
                
                # Validate required fields
                if 'conceptHighlight' not in request.data:
                    return Response({
                        'code': 0,
                        'message': "conceptHighlight is required"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if 'items' not in request.data or not request.data['items']:
                    return Response({
                        'code': 0,
                        'message': "At least one item is required"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Update basic fields
                instance.conceptHighlight = request.data['conceptHighlight']
                instance.conceptCount = len(request.data['items'])
                instance.save()
                
                # Delete existing items
                instance.items.all().delete()
                
                # Create new items
                for i, item_data in enumerate(request.data['items']):
                    if not item_data.get('heading') or not item_data.get('paragraph'):
                        return Response({
                            'code': 0,
                            'message': f"Item {i+1}: heading and paragraph are required"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    ConceptItem.objects.create(
                        concept=instance,
                        heading=item_data['heading'],
                        paragraph=item_data['paragraph'],
                        order=i + 1
                    )
                
                return Response({
                    'code': 1,
                    'message': "Concept saved successfully"
                })
                
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['DELETE'], url_path='delete_concept')
    def delete_concept(self, request):
        """Delete all concept data"""
        try:
            with transaction.atomic():
                instance = ConceptModel.get_solo()
                
                # Delete all items first
                instance.items.all().delete()
                
                # Reset concept to default values
                instance.conceptHighlight = ""
                instance.conceptCount = 0
                instance.save()
                
                return Response({
                    'code': 1,
                    'message': "Concept deleted successfully"
                })
                
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['DELETE'], url_path='delete_item')
    def delete_item(self, request, pk=None):
        """Delete a specific concept item"""
        try:
            item_id = request.data.get('item_id')
            if not item_id:
                return Response({
                    'code': 0,
                    'message': "item_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                instance = ConceptModel.get_solo()
                
                # Delete the specific item
                deleted_count = instance.items.filter(id=item_id).delete()[0]
                
                if deleted_count == 0:
                    return Response({
                        'code': 0,
                        'message': "Item not found"
                    }, status=status.HTTP_404_NOT_FOUND)
                
                # Update concept count and reorder remaining items
                remaining_items = instance.items.all().order_by('order')
                for index, item in enumerate(remaining_items):
                    item.order = index + 1
                    item.save()
                
                instance.conceptCount = remaining_items.count()
                instance.save()
                
                return Response({
                    'code': 1,
                    'message': "Item deleted successfully"
                })
                
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactEnquiryViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'processing': [PublicCreateOnly],
    }
    default_permissions = [IsAdmin]
    queryset = ContactEnquiryModel.objects.filter(hideStatus=0)
    serializer_class = ContactEnquiryModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = ContactEnquiryModelSerializers(
                ContactEnquiryModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = ContactEnquiryModelSerializers(
                ContactEnquiryModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = ContactEnquiryModelSerializers(data=request.data)
        else:
            serializer = ContactEnquiryModelSerializers(instance=ContactEnquiryModel.objects.get(id=pk),
                                                        data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        ContactEnquiryModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)
    
    # Updated action to toggle status
    @action(detail=True, methods=['POST'])
    def toggle_status(self, request, pk=None):
        try:
            enquiry = ContactEnquiryModel.objects.get(id=pk, hideStatus=0)
            
            # Toggle the status
            new_status = 'completed' if enquiry.status == 'pending' else 'pending'
            enquiry.status = new_status
            enquiry.save()
            
            response = {
                'code': 1, 
                'message': f"Status updated to {new_status} successfully",
                'new_status': new_status
            }
        except ContactEnquiryModel.DoesNotExist:
            response = {'code': 0, 'message': "Enquiry not found"}
        
        return Response(response)


class MemberEnquiryViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'processing': [PublicCreateOnly],
    }
    default_permissions = [IsAdmin]
    queryset = MemberEnquiryModel.objects.filter(hideStatus=0)
    serializer_class = MemberEnquiryModelSerializers

    @action(detail=False, methods=['GET'], url_path='listing/(?P<enquiry_id>[^/.]+)')
    def listing(self, request, enquiry_id=None):
        """
        List member enquiries
        URL: /apis/memberEnquiry/listing/0/ or /apis/memberEnquiry/listing/{id}/
        """
        try:
            if enquiry_id == "0":
                queryset = MemberEnquiryModel.objects.filter(hideStatus=0).order_by('-id')
                serializer = MemberEnquiryModelSerializers(queryset, many=True)
            else:
                queryset = MemberEnquiryModel.objects.filter(hideStatus=0, id=enquiry_id).order_by('-id')
                serializer = MemberEnquiryModelSerializers(queryset, many=True)
            
            response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
            return Response(response, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error in listing enquiries: {str(e)}")
            response = {'code': 0, 'message': safe_error(e, 'Error retrieving enquiries')}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'], url_path='processing/(?P<enquiry_id>[^/.]+)')
    def processing(self, request, enquiry_id=None):
        """
        Process member enquiry (create or update)
        URL: /apis/memberEnquiry/processing/0/ (create) or /apis/memberEnquiry/processing/{id}/ (update)
        """
        try:
            data = request.data.copy()
            
            if enquiry_id == "0":
                # Creating new enquiry
                serializer = MemberEnquiryModelSerializers(data=data)
            else:
                # Updating existing enquiry
                instance = get_object_or_404(MemberEnquiryModel, id=enquiry_id, hideStatus=0)
                serializer = MemberEnquiryModelSerializers(instance=instance, data=data, partial=True)
            
            if serializer.is_valid():
                enquiry = serializer.save()
                
                response = {
                    'code': 1, 
                    'message': "Done Successfully", 
                    'data': serializer.data
                }
                return Response(response, status=status.HTTP_200_OK)
            else:
                logger.error(f"Serializer validation failed: {serializer.errors}")
                response = {
                    'code': 0, 
                    'message': "Unable to Process Request",
                    'errors': serializer.errors
                }
                return Response(response, status=status.HTTP_400_BAD_REQUEST)
                
        except MemberEnquiryModel.DoesNotExist:
            response = {'code': 0, 'message': "Enquiry not found"}
            return Response(response, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in processing enquiry: {str(e)}")
            response = {'code': 0, 'message': safe_error(e, 'Error')}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['DELETE'], url_path='deletion/(?P<enquiry_id>[^/.]+)')
    def deletion(self, request, enquiry_id=None):
        """
        Soft delete member enquiry
        URL: /apis/memberEnquiry/deletion/{id}/
        """
        try:
            # Check if enquiry exists and is not converted
            enquiry = get_object_or_404(MemberEnquiryModel, id=enquiry_id, hideStatus=0)
            
            # Prevent deletion of converted enquiries
            if enquiry.is_converted:
                response = {
                    'code': 0, 
                    'message': "Cannot delete converted enquiry. This enquiry has been converted to a member."
                }
                return Response(response, status=status.HTTP_400_BAD_REQUEST)
            
            # Soft delete the enquiry
            affected_rows = MemberEnquiryModel.objects.filter(id=enquiry_id, hideStatus=0).update(hideStatus=1)
            
            if affected_rows > 0:
                response = {'code': 1, 'message': "Done Successfully"}
                return Response(response, status=status.HTTP_200_OK)
            else:
                response = {'code': 0, 'message': "Enquiry not found or already deleted"}
                return Response(response, status=status.HTTP_404_NOT_FOUND)
                
        except MemberEnquiryModel.DoesNotExist:
            response = {'code': 0, 'message': "Enquiry not found"}
            return Response(response, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in deleting enquiry: {str(e)}")
            response = {'code': 0, 'message': safe_error(e, 'Error')}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'], url_path='mark-converted/(?P<enquiry_id>[^/.]+)')
    def mark_converted(self, request, enquiry_id=None):
        """
        Mark an enquiry as converted to member
        URL: /apis/memberEnquiry/mark-converted/{id}/
        Expected data: {'convertedMemberId': 'MEMBER_ID'}
        """
        try:
            
            enquiry = get_object_or_404(MemberEnquiryModel, id=enquiry_id, hideStatus=0)
            
            # Check if already converted
            if enquiry.is_converted:
                response = {
                    'code': 0, 
                    'message': f"Enquiry already converted to member {enquiry.converted_member_id}"
                }
                logger.warning(f"Enquiry {enquiry_id} is already converted")
                return Response(response, status=status.HTTP_400_BAD_REQUEST)
            
            converted_member_id = request.data.get('convertedMemberId')
            if not converted_member_id:
                response = {'code': 0, 'message': "convertedMemberId is required"}
                logger.error("convertedMemberId not provided in request")
                return Response(response, status=status.HTTP_400_BAD_REQUEST)
            
            # Update enquiry as converted
            enquiry.is_converted = True
            enquiry.converted_member_id = converted_member_id
            enquiry.converted_date = timezone.now().astimezone(UK_TIMEZONE)
            
            # FIXED: Use update_fields to ensure the save operation only updates these specific fields
            enquiry.save(update_fields=['is_converted', 'converted_member_id', 'converted_date'])
            
            # FIXED: Verify the update was successful by reloading from database
            enquiry.refresh_from_db()
            
            
            response = {
                'code': 1, 
                'message': f"Enquiry successfully marked as converted to member {converted_member_id}",
                'data': {
                    'enquiryId': enquiry.id,
                    'convertedMemberId': enquiry.converted_member_id,
                    'convertedDate': enquiry.converted_date.isoformat() if enquiry.converted_date else None,
                    'isConverted': enquiry.is_converted
                }
            }
            return Response(response, status=status.HTTP_200_OK)
            
        except MemberEnquiryModel.DoesNotExist:
            logger.error(f"Enquiry {enquiry_id} not found")
            response = {'code': 0, 'message': "Enquiry not found"}
            return Response(response, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error marking enquiry as converted: {str(e)}", exc_info=True)
            response = {'code': 0, 'message': safe_error(e, 'Error')}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AboutViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'get_about': [AllowAny],
        'listing': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = AboutModel.objects.filter(hideStatus=0)
    serializer_class = AboutModelSerializer

    @action(detail=False, methods=['GET'], url_path='get_about')
    def get_about(self, request):
        try:
            about = AboutModel.get_solo()
            serializer = self.get_serializer(about)
            return Response({
                'status': 'success',
                'message': 'About section retrieved successfully',
                'data': serializer.data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)

    @action(detail=False, methods=['POST'], url_path='create_or_update_about')
    def create_or_update_about(self, request):
        try:
            about = AboutModel.get_solo()
            serializer = self.get_serializer(about, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'About section updated successfully',
                    'data': serializer.data
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=400)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        try:
            about = self.get_object()
            serializer = self.get_serializer(about)
            return Response({
                'status': 'success',
                'message': 'About section retrieved successfully',
                'data': serializer.data
            })
        except AboutModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'About section not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            about = self.get_object()
            serializer = self.get_serializer(about, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'About section updated successfully',
                    'data': serializer.data
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=400)
        except AboutModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'About section not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            about = self.get_object()
            about.hideStatus = 1
            about.save()
            return Response({
                'status': 'success',
                'message': 'About section deleted successfully'
            })
        except AboutModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'About section not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)


def index_view(request):
    courses = CourseModel.objects.filter(hideStatus=0).order_by('-createdAt')
    blogs = BlogModel.objects.filter(hideStatus=0).order_by('-createdAt')
    concept = ConceptModel.get_solo()
    about = AboutModel.get_solo()

    context = {
        'courses': courses,
        'blogs': blogs,
        'concepts': [concept],
        'about': about
    }
    return render(request, 'index.html', context)


def membership_view(request):
    plan = PlanModel.objects.filter(hideStatus=0).order_by('-createdAt')

    context = {
        'plan': plan,
    }
    return render(request, 'membership.html', context)


def blog_detail_view(request, blog_id):
    blogs = BlogModel.objects.filter(hideStatus=0).order_by('-blogDate')

    if blog_id:
        # Get specific blog post if ID is provided
        current_blog = get_object_or_404(BlogModel, id=blog_id, hideStatus=0)
    else:
        # Get the latest blog post if no ID provided
        current_blog = blogs.first() if blogs.exists() else None

    context = {
        'blogs': blogs,
        'current_blog': current_blog,
    }
    return render(request, 'news.html', context)


class EventViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    permission_map = {
        'listing': [AllowAny],
        'active_events': [AllowAny],
        'event_detail': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = EventModel.objects.filter(hideStatus=0)
    serializer_class = EventModelSerializer
    
    def get_queryset(self):
        queryset = EventModel.objects.filter(hideStatus=0)
        
        # Filter by active status if provided
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('-EventEndDate', '-createdAt')
    
    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        try:
            if pk == '0':
                # Return all events when pk is '0'
                events = self.get_queryset()
                serializer = self.get_serializer(events, many=True)
                return Response({
                    'status': 'success',
                    'message': 'Events retrieved successfully',
                    'data': serializer.data
                })
            else:
                # Return specific event
                event = self.get_object()
                serializer = self.get_serializer(event)
                return Response({
                    'status': 'success',
                    'message': 'Event details retrieved successfully',
                    'data': serializer.data
                })
        except EventModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Event not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)
    
    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            event_id = pk if pk != '0' else None
            
            # Handle data properly without deep copying file objects
            data = {}
            files = request.FILES
            
            # Extract data from request.data without copying file objects
            for key, value in request.data.items():
                if key not in files:
                    data[key] = value
            
            # Add file fields from request.FILES
            for key, file_obj in files.items():
                data[key] = file_obj
            
            # Remove empty file fields from data
            file_fields = [
                'EventImage', 'EventActivitiesimageOne', 'EventActivitiesimageTwo'
            ]
            
            for field in file_fields:
                if field in data and (data[field] == '' or data[field] == 'null' or data[field] is None or str(data[field]).strip() == ''):
                    data.pop(field, None)
            
            # Handle boolean field conversion
            if 'is_active' in data:
                if isinstance(data['is_active'], str):
                    data['is_active'] = data['is_active'].lower() == 'true'
            
            if event_id:
                # Update existing event
                event = EventModel.objects.get(id=event_id, hideStatus=0)
                serializer = self.get_serializer(event, data=data, partial=True, context={'request': request})
            else:
                # Create new event
                serializer = self.get_serializer(data=data, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'Event saved successfully',
                    'data': serializer.data
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=400)
                
        except EventModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Event not found'
            }, status=404)
        except Exception as e:
            import traceback
            logger.exception('Unhandled error')
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Error processing event')
            }, status=500)
    
    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            event = EventModel.objects.get(id=pk, hideStatus=0)
            event.hideStatus = 1
            event.save()
            
            return Response({
                'status': 'success',
                'message': 'Event deleted successfully'
            })
        except EventModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Event not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=500)
    
    @action(detail=False, methods=['GET'])
    def active_events(self, request):
        """Get all active events"""
        try:
            events = self.get_queryset().filter(is_active=True)
            serializer = self.get_serializer(events, many=True)
            return Response({
                'status': 'success',
                'message': 'Active events retrieved successfully',
                'data': serializer.data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Error retrieving events')
            }, status=500)
    
    @action(detail=True, methods=['GET'])
    def event_detail(self, request, pk=None):
        """Get detailed event information"""
        try:
            event = self.get_object()
            serializer = self.get_serializer(event)
            return Response({
                'status': 'success',
                'message': 'Event details retrieved successfully',
                'data': serializer.data
            })
        except EventModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Event not found'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Error retrieving event details')
            }, status=500)


class EventInterestViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing event interests"""
    default_permissions = [IsMember]
    serializer_class = EventInterestSerializer
    
    def get_queryset(self):
        """Get interests for the authenticated member"""
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            try:
                member = MemberModel.objects.get(email=self.request.user.email)
                return EventInterestModel.objects.filter(member=member, hideStatus=0)
            except MemberModel.DoesNotExist:
                return EventInterestModel.objects.none()
        return EventInterestModel.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create or update interest for an event"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
        except MemberModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Member not found'
            }, status=404)
        
        event_id = request.data.get('event')
        if not event_id:
            return Response({
                'status': 'error',
                'message': 'Event ID is required'
            }, status=400)
        
        try:
            event = EventModel.objects.get(id=event_id, hideStatus=0)
        except EventModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Event not found'
            }, status=404)
        
        # Check if interest already exists
        interest, created = EventInterestModel.objects.get_or_create(
            member=member,
            event=event,
            defaults={'is_interested': True}
        )
        
        if not created:
            # Update existing interest
            interest.is_interested = True
            interest.save()
        
        serializer = self.get_serializer(interest)
        return Response({
            'status': 'success',
            'message': 'Interest registered successfully',
            'data': serializer.data
        }, status=201 if created else 200)
    
    @action(detail=True, methods=['POST'])
    def toggle_interest(self, request, pk=None):
        """Toggle interest status for an event"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
        except MemberModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Member not found'
            }, status=404)
        
        try:
            interest = EventInterestModel.objects.get(
                id=pk, 
                member=member, 
                hideStatus=0
            )
            interest.is_interested = not interest.is_interested
            interest.save()
            
            serializer = self.get_serializer(interest)
            action = 'registered' if interest.is_interested else 'removed'
            return Response({
                'status': 'success',
                'message': f'Interest {action} successfully',
                'data': serializer.data
            })
        except EventInterestModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Interest not found'
            }, status=404)
    
    @action(detail=False, methods=['GET'])
    def member_interests(self, request):
        """Get all interests for the authenticated member"""
        try:
            interests = self.get_queryset()
            serializer = self.get_serializer(interests, many=True)
            return Response({
                'status': 'success',
                'message': 'Member interests retrieved successfully',
                'data': serializer.data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Error retrieving member interests')
            }, status=500)

    def get_memberFullName(self, obj):
        return f"{obj.member.firstName} {obj.member.lastName}"

    def validate(self, data):
        # Ensure member can only have one interest per event
        member = data.get('member')
        event = data.get('event')
        
        if member and event:
            existing_interest = EventInterestModel.objects.filter(
                member=member,
                event=event,
                hideStatus=0
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_interest.exists():
                raise serializers.ValidationError("Member already has interest in this event")
        
        return data


class ProtocolViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing protocols"""
    permission_map = {
        'listing': [AllowAny],
        'active_protocols': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = ProtocolModel.objects.filter(hideStatus=0)
    serializer_class = ProtocolModelSerializer

    def get_queryset(self):
        return ProtocolModel.objects.filter(hideStatus=0)

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        try:
            if pk == '0':
                protocols = self.get_queryset()
                serializer = self.get_serializer(protocols, many=True)
                return Response({
                    'status': 'success',
                    'data': serializer.data
                })
            else:
                protocol = self.get_object()
                serializer = self.get_serializer(protocol)
                return Response({
                    'status': 'success',
                    'data': serializer.data
                })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == '0':
                # Create new protocol
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'Protocol created successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
            else:
                # Update existing protocol
                protocol = self.get_object()
                serializer = self.get_serializer(protocol, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'Protocol updated successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            protocol = self.get_object()
            protocol.hideStatus = 1
            protocol.save()
            return Response({
                'status': 'success',
                'message': 'Protocol deleted successfully'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=False, methods=['GET'])
    def active_protocols(self, request):
        """Get all active protocols"""
        try:
            protocols = self.get_queryset()
            serializer = self.get_serializer(protocols, many=True)
            return Response({
                'status': 'success',
                'data': serializer.data
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)


class InstructorViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing instructors"""
    permission_map = {
        'listing': [AllowAny],
        'active_instructors': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = InstructorModel.objects.filter(hideStatus=0)
    serializer_class = InstructorModelSerializer

    def get_queryset(self):
        return InstructorModel.objects.filter(hideStatus=0)

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        try:
            if pk == '0':
                instructors = self.get_queryset()
                serializer = self.get_serializer(instructors, many=True)
                return Response({
                    'status': 'success',
                    'data': serializer.data
                })
            else:
                instructor = self.get_object()
                serializer = self.get_serializer(instructor)
                return Response({
                    'status': 'success',
                    'data': serializer.data
                })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == '0':
                # Create new instructor
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'Instructor created successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
            else:
                # Update existing instructor
                instructor = self.get_object()
                serializer = self.get_serializer(instructor, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'Instructor updated successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            instructor = self.get_object()
            instructor.hideStatus = 1
            instructor.save()
            return Response({
                'status': 'success',
                'message': 'Instructor deleted successfully'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': safe_error(e, 'Request failed')
            }, status=400)

    @action(detail=False, methods=['GET'])
    def active_instructors(self, request):
        """Get all active instructors"""
        try:
            instructors = InstructorModel.objects.filter(hideStatus=0).order_by('instructorName')
            serializer = InstructorModelSerializer(instructors, many=True, context={'request': request})
            response = {'code': 1, 'data': serializer.data, 'message': "Active instructors retrieved successfully"}
            return Response(response, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error retrieving active instructors: {str(e)}")
            response = {'code': 0, 'message': safe_error(e, 'Error retrieving instructors')}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MessageViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing messages"""
    permission_map = {
        'create_message': [PublicCreateOnly],
    }
    default_permissions = [IsAdmin]
    queryset = MessageModel.objects.filter(hideStatus=0)
    serializer_class = MessageModelSerializer

    def get_queryset(self):
        return MessageModel.objects.filter(hideStatus=0).order_by('-createdAt')

    @action(detail=False, methods=['GET'], url_path='listing/(?P<message_id>[^/.]+)')
    def listing(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            serializer = self.get_serializer(message)
            return Response({
                'status': 'success',
                'message': 'Message retrieved successfully',
                'data': serializer.data
            })
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['POST'], url_path='processing/(?P<message_id>[^/.]+)')
    def processing(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            serializer = self.get_serializer(message, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'status': 'success',
                    'message': 'Message updated successfully',
                    'data': serializer.data
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Validation error',
                    'errors': serializer.errors
                }, status=400)
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['DELETE'], url_path='deletion/(?P<message_id>[^/.]+)')
    def deletion(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            message.hideStatus = 1
            message.save()
            return Response({
                'status': 'success',
                'message': 'Message deleted successfully'
            })
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['POST'], url_path='mark_as_read/(?P<message_id>[^/.]+)')
    def mark_as_read(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            message.mark_as_read()
            return Response({
                'status': 'success',
                'message': 'Message marked as read'
            })
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['POST'], url_path='mark_as_replied/(?P<message_id>[^/.]+)')
    def mark_as_replied(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            message.mark_as_replied()
            return Response({
                'status': 'success',
                'message': 'Message marked as replied'
            })
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['POST'], url_path='mark_as_closed/(?P<message_id>[^/.]+)')
    def mark_as_closed(self, request, message_id=None):
        try:
            message = MessageModel.objects.get(id=message_id, hideStatus=0)
            message.mark_as_closed()
            return Response({
                'status': 'success',
                'message': 'Message marked as closed'
            })
        except MessageModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Message not found'
            }, status=404)

    @action(detail=False, methods=['GET'])
    def new_messages(self, request):
        new_messages = MessageModel.objects.filter(hideStatus=0, status='new')
        serializer = self.get_serializer(new_messages, many=True)
        return Response({
            'status': 'success',
            'message': 'New messages retrieved successfully',
            'data': serializer.data
        })

    @action(detail=False, methods=['GET'], url_path='listing/0')
    def list_all_messages(self, request):
        """List all messages (when called with id=0)"""
        messages = MessageModel.objects.filter(hideStatus=0).order_by('-createdAt')
        serializer = self.get_serializer(messages, many=True)
        return Response({
            'status': 'success',
            'message': 'Messages retrieved successfully',
            'data': serializer.data
        })

    @action(detail=False, methods=['POST'], url_path='processing/0')
    def create_message(self, request):
        """Create a new message (when called with id=0)"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'status': 'success',
                'message': 'Message created successfully',
                'data': serializer.data
            })
        else:
            return Response({
                'status': 'error',
                'message': 'Validation error',
                'errors': serializer.errors
            }, status=400)


class FAQViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing FAQs"""
    permission_map = {
        'listing': [AllowAny],
        'active_faqs': [AllowAny],
        'list': [AllowAny],
        'retrieve': [AllowAny],
    }
    default_permissions = [IsAdmin]
    queryset = FAQModel.objects.filter(hideStatus=0)
    serializer_class = FAQModelSerializer

    def get_queryset(self):
        return FAQModel.objects.filter(hideStatus=0).order_by('-createdAt')

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        try:
            if pk == '0':
                # Return all FAQs
                faqs = FAQModel.objects.filter(hideStatus=0).order_by('-createdAt')
                serializer = self.get_serializer(faqs, many=True)
                return Response({
                    'status': 'success',
                    'message': 'FAQs retrieved successfully',
                    'data': serializer.data
                })
            else:
                # Return specific FAQ
                faq = FAQModel.objects.get(id=pk, hideStatus=0)
                serializer = self.get_serializer(faq)
                return Response({
                    'status': 'success',
                    'message': 'FAQ retrieved successfully',
                    'data': serializer.data
                })
        except FAQModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'FAQ not found'
            }, status=404)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == '0':
                # Create new FAQ
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'FAQ created successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
            else:
                # Update existing FAQ
                faq = FAQModel.objects.get(id=pk, hideStatus=0)
                serializer = self.get_serializer(faq, data=request.data, partial=True)
                
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'status': 'success',
                        'message': 'FAQ updated successfully',
                        'data': serializer.data
                    })
                else:
                    return Response({
                        'status': 'error',
                        'message': 'Validation error',
                        'errors': serializer.errors
                    }, status=400)
        except FAQModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'FAQ not found'
            }, status=404)

    @action(detail=True, methods=['DELETE'])
    def deletion(self, request, pk=None):
        try:
            faq = FAQModel.objects.get(id=pk, hideStatus=0)
            faq.hideStatus = 1
            faq.save()
            return Response({
                'status': 'success',
                'message': 'FAQ deleted successfully'
            })
        except FAQModel.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'FAQ not found'
            }, status=404)

    @action(detail=False, methods=['GET'])
    def active_faqs(self, request):
        """Get all active FAQs"""
        faqs = FAQModel.objects.filter(hideStatus=0).order_by('-createdAt')
        serializer = self.get_serializer(faqs, many=True)
        return Response({
            'status': 'success',
            'message': 'Active FAQs retrieved successfully',
            'data': serializer.data
        })


class OrdersViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing orders and order statistics"""
    default_permissions = [IsMember]
    serializer_class = BookingSerializer
    
    def get_queryset(self):
        """Get all bookings for the authenticated member"""
        try:
            member = MemberModel.objects.get(email=self.request.user.email)
            return BookingModel.objects.filter(
                member=member,
                hideStatus=0
            ).prefetch_related('tee__course').order_by('-createdAt')
        except MemberModel.DoesNotExist:
            return BookingModel.objects.none()

    @action(detail=False, methods=['GET'])
    def statistics(self, request):
        """Get enhanced order statistics for the authenticated member (8 counters)"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
            
            # Get all bookings for this member (own bookings)
            own_bookings = BookingModel.objects.filter(
                member=member,
                is_join_request=False,
                hideStatus=0
            ).prefetch_related('tee__course')
            
            # Get sent join requests (user's requests to join others' bookings)
            sent_requests = JoinRequestModel.objects.filter(
                member=member,
                hideStatus=0
            )
            
            # Get received join requests (requests to join user's bookings)
            received_requests = JoinRequestModel.objects.filter(
                original_booking__member=member,
                hideStatus=0
            )
            
            # Calculate 8 statistics counters
            # 1. Total Bookings (own + approved sent requests + approved received requests)
            confirmed_own = own_bookings.filter(status__in=['confirmed', 'completed']).count()
            approved_sent = sent_requests.filter(status='approved').count()
            approved_received = received_requests.filter(status='approved').count()
            total_bookings = confirmed_own + approved_sent + approved_received
            
            # 2. Confirmed (same as total for now)
            confirmed = total_bookings
            
            # 3. Pending Sent Requests
            pending_sent_requests = sent_requests.filter(status='pending_approval').count()
            
            # 4. Pending Received Requests
            pending_received_requests = received_requests.filter(status='pending_approval').count()
            
            # 5. Sent Requests Accepted
            sent_requests_accepted = approved_sent
            
            # 6. Received Requests Accepted
            received_requests_accepted = approved_received
            
            # 7. Rejected Received Requests
            rejected_received_requests = received_requests.filter(status='rejected').count()
            
            # 8. Rejected Sent Requests
            rejected_sent_requests = sent_requests.filter(status='rejected').count()
            
            return Response({
                'code': 1,
                'message': 'Enhanced order statistics retrieved successfully',
                'data': {
                    'total_bookings': total_bookings,
                    'confirmed': confirmed,
                    'pending_sent_requests': pending_sent_requests,
                    'pending_received_requests': pending_received_requests,
                    'sent_requests_accepted': sent_requests_accepted,
                    'received_requests_accepted': received_requests_accepted,
                    'rejected_received_requests': rejected_received_requests,
                    'rejected_sent_requests': rejected_sent_requests,
                    # Additional breakdown for filtering
                    'own_bookings_count': own_bookings.count(),
                    'sent_requests_count': sent_requests.count(),
                    'received_requests_count': received_requests.count(),
                    # Legacy fields for backward compatibility
                    'total': total_bookings,
                    'pendingRequests': pending_sent_requests,
                    'requestsAccepted': sent_requests_accepted,
                    'acceptRejectActions': pending_received_requests
                }
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving enhanced order statistics')
            }, status=500)

    @action(detail=False, methods=['GET'])
    def by_status(self, request):
        """Get orders filtered by status"""
        try:
            status = request.query_params.get('status', 'all')
            member = MemberModel.objects.get(email=request.user.email)
            
            queryset = self.get_queryset()
            
            if status == 'confirmed':
                queryset = queryset.filter(
                    Q(status='confirmed', is_join_request=False) |
                    Q(status='approved', is_join_request=True)
                )
            elif status == 'pending_approval':
                queryset = queryset.filter(
                    status='pending_approval',
                    is_join_request=True
                )
            elif status == 'approved':
                queryset = queryset.filter(
                    status='approved',
                    is_join_request=True
                )
            # 'all' shows everything (no additional filtering)
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'code': 1,
                'message': f'Orders filtered by {status} retrieved successfully',
                'data': serializer.data,
                'count': queryset.count()
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error filtering orders')
            }, status=500)

    @action(detail=False, methods=['GET'])
    def enhanced_orders(self, request):
        """Get enhanced orders data with all bookings and join requests"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
            
            # Get own bookings
            own_bookings = BookingModel.objects.filter(
                member=member,
                is_join_request=False,
                hideStatus=0
            ).prefetch_related('tee__course', 'join_requests').order_by('-createdAt')
            
            # Get sent join requests
            sent_requests = JoinRequestModel.objects.filter(
                member=member,
                hideStatus=0
            ).select_related('original_booking__course', 'original_booking__tee', 'original_booking__member').order_by('-createdAt')
            
            # Get received join requests
            received_requests = JoinRequestModel.objects.filter(
                original_booking__member=member,
                hideStatus=0
            ).select_related('member', 'original_booking__course', 'original_booking__tee').order_by('-createdAt')
            
            # Serialize the data
            own_bookings_data = BookingSerializer(own_bookings, many=True, context={'request': request}).data
            sent_requests_data = JoinRequestSerializer(sent_requests, many=True, context={'request': request}).data
            received_requests_data = JoinRequestSerializer(received_requests, many=True, context={'request': request}).data
            
            return Response({
                'code': 1,
                'message': 'Enhanced orders data retrieved successfully',
                'data': {
                    'own_bookings': own_bookings_data,
                    'sent_requests': sent_requests_data,
                    'received_requests': received_requests_data
                }
            })
            
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving enhanced orders')
            }, status=500)

    @action(detail=False, methods=['GET'])
    def pending_review(self, request):
        """Get incoming join requests that need review by the authenticated member"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
            
            # Get join requests for slots booked by this member
            incoming_requests = BookingModel.objects.filter(
                original_booking__member=member,
                is_join_request=True,
                status='pending_approval',
                hideStatus=0
            ).select_related(
                'member', 'course', 'tee', 'original_booking'
            ).order_by('-createdAt')
            
            # Create a custom response with join request details
            requests_data = []
            for join_request in incoming_requests:
                original_booking = join_request.original_booking
                requests_data.append({
                    'id': join_request.id,
                    'requestId': f"JR-{join_request.id}",
                    'memberName': f"{join_request.member.firstName} {join_request.member.lastName}",
                    'memberId': join_request.member.id,
                    'courseName': join_request.course.courseName,
                    'teeHoles': join_request.tee.holeNumber if join_request.tee else None,
                    'slotDate': join_request.slot_date.strftime('%Y-%m-%d') if join_request.slot_date else None,
                    'bookingTime': join_request.booking_time.strftime('%H:%M') if join_request.booking_time else None,
                    'participants': join_request.participants,
                    'status': join_request.status,
                    'createdAt': join_request.createdAt.isoformat() if join_request.createdAt else None,
                    'originalBookingId': original_booking.id,
                    'originalBookingParticipants': original_booking.participants,
                    'availableSpots': 4 - (original_booking.participants + join_request.participants),
                    'canApprove': (original_booking.participants + join_request.participants) <= 4
                })
            
            return Response({
                'code': 1,
                'message': 'Pending review requests retrieved successfully',
                'data': requests_data,
                'count': len(requests_data)
            })
            
        except MemberModel.DoesNotExist:
            return Response({
                'code': 0,
                'message': 'Member not found'
            }, status=404)
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving pending review requests')
            }, status=500)


class JoinRequestViewSet(ActionPermissionMixin, viewsets.ModelViewSet):
    """ViewSet for managing join requests"""
    permission_map = {
        'admin_all_requests': [IsAdmin],
    }
    default_permissions = [IsMember]
    serializer_class = JoinRequestSerializer
    
    def get_queryset(self):
        """Get join requests based on user role"""
        try:
            member = MemberModel.objects.get(email=self.request.user.email)
            
            # Get join requests where the current user is either:
            # 1. The requester (outgoing requests)
            # 2. The original booker (incoming requests)
            return JoinRequestModel.objects.filter(
                Q(member=member) | Q(original_booking__member=member),
                hideStatus=0
            ).select_related('member', 'original_booking', 'original_booking__course', 'original_booking__tee')
        except MemberModel.DoesNotExist:
            return JoinRequestModel.objects.none()

    def list(self, request, *args, **kwargs):
        """List join requests (sweeps stale ones to 'expired' first)."""
        JoinRequestModel.expire_stale_requests()
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['GET'], url_path='admin/all-requests')
    def admin_all_requests(self, request):
        """Admin endpoint to get all join requests across all members"""
        try:
            # Expire any requests past their course cut-off before returning
            JoinRequestModel.expire_stale_requests()
            # Get all join requests without member filtering
            all_requests = JoinRequestModel.objects.filter(
                hideStatus=0
            ).select_related(
                'member', 'original_booking', 'original_booking__course', 
                'original_booking__tee', 'original_booking__member'
            ).order_by('-createdAt')
            
            serializer = self.get_serializer(all_requests, many=True)
            
            return Response({
                'code': 1,
                'message': 'All join requests retrieved successfully',
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving all join requests')
            }, status=500)

    @action(detail=False, methods=['GET'])
    def incoming_requests(self, request):
        """Get incoming join requests for the current user's bookings"""
        try:
            JoinRequestModel.expire_stale_requests()
            member = MemberModel.objects.get(email=request.user.email)

            # Get join requests for bookings owned by the current user
            incoming_requests = JoinRequestModel.objects.filter(
                original_booking__member=member,
                status='pending_approval',
                hideStatus=0
            ).select_related(
                'member', 'original_booking', 'original_booking__course', 
                'original_booking__tee'
            ).order_by('-createdAt')
            
            serializer = self.get_serializer(incoming_requests, many=True)
            
            return Response({
                'code': 1,
                'message': 'Incoming join requests retrieved successfully',
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving incoming requests')
            }, status=500)
    
    @action(detail=False, methods=['GET'])
    def outgoing_requests(self, request):
        """Get outgoing join requests made by the current user"""
        try:
            JoinRequestModel.expire_stale_requests()
            member = MemberModel.objects.get(email=request.user.email)

            # Get join requests made by the current user
            outgoing_requests = JoinRequestModel.objects.filter(
                member=member,
                hideStatus=0
            ).select_related(
                'original_booking', 'original_booking__course', 
                'original_booking__tee', 'original_booking__member'
            ).order_by('-createdAt')
            
            serializer = self.get_serializer(outgoing_requests, many=True)
            
            return Response({
                'code': 1,
                'message': 'Outgoing join requests retrieved successfully',
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving outgoing requests')
            }, status=500)
    
    @action(detail=True, methods=['POST'])
    def approve(self, request, pk=None):
        """Approve a join request"""
        try:
            join_request = self.get_object()
            member = MemberModel.objects.get(email=request.user.email)
            
            # Verify the current user owns the original booking
            if join_request.original_booking.member != member:
                return Response({
                    'code': 0,
                    'message': 'You can only approve requests for your own bookings'
                }, status=403)
            
            # Check if request is still pending
            if join_request.status != 'pending_approval':
                return Response({
                    'code': 0,
                    'message': 'This request has already been processed'
                }, status=400)

            # Enforce the course cut-off: expire instead of approving if the window passed
            if join_request.is_expired_now():
                join_request.status = 'expired'
                join_request.save(update_fields=['status', 'updatedAt'])
                NotificationModel.create_join_request_expired_notification(
                    recipient=join_request.member,
                    booking=join_request.original_booking,
                )
                return Response({
                    'code': 0,
                    'message': 'This request has expired and can no longer be approved.'
                }, status=400)

            # Check if slot can accommodate the request
            original_booking = join_request.original_booking
            total_participants = original_booking.participants + join_request.participants
            
            if total_participants > 4:
                return Response({
                    'code': 0,
                    'message': f'Slot cannot accommodate {join_request.participants} additional participants. Maximum is 4.'
                }, status=400)

            # The requester may have booked elsewhere while this sat pending.
            clash = BookingModel.find_member_clash(
                join_request.member_id,
                original_booking.slot_date,
                original_booking.booking_time,
                exclude_join_request_id=join_request.id,
            )
            if clash:
                return Response({
                    'code': 0,
                    'message': (
                        f'{join_request.member.firstName} already has a booking at this '
                        f'date and time ({clash}), so this request can no longer be approved.'
                    )
                }, status=400)

            # Approve the request
            join_request.status = 'approved'
            join_request.approved_by = member
            join_request.approved_at = timezone.now().astimezone(UK_TIMEZONE)
            join_request.save()
            
            # Update original booking participants
            original_booking.participants = total_participants
            original_booking.save()
            
            # Create notification for the requester
            NotificationModel.create_join_response_notification(
                recipient=join_request.member,
                sender=member,
                booking=original_booking,
                is_approved=True
            )
            
            # Auto-reject other pending requests if slot is now full
            if total_participants == 4:
                other_pending = JoinRequestModel.objects.filter(
                    original_booking=original_booking,
                    status='pending_approval',
                    hideStatus=0
                ).exclude(id=join_request.id)
                
                for other_request in other_pending:
                    other_request.status = 'rejected'
                    other_request.notes = 'Automatically rejected - slot is full'
                    other_request.save()
                    
                    # Notify other rejected requesters
                    NotificationModel.create_join_response_notification(
                        recipient=other_request.member,
                        sender=member,
                        booking=original_booking,
                        is_approved=False,
                        reason='Slot is full'
                    )
            
            return Response({
                'code': 1,
                'message': 'Join request approved successfully',
                'data': {
                    'requestId': join_request.request_id,
                    'originalBookingId': original_booking.booking_id,
                    'newTotalParticipants': total_participants,
                    'remainingSlots': max(0, 4 - total_participants)
                }
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error approving join request')
            }, status=500)
    
    @action(detail=True, methods=['POST'])
    def reject(self, request, pk=None):
        """Reject a join request"""
        try:
            join_request = self.get_object()
            member = MemberModel.objects.get(email=request.user.email)
            
            # Verify the current user owns the original booking
            if join_request.original_booking.member != member:
                return Response({
                    'code': 0,
                    'message': 'You can only reject requests for your own bookings'
                }, status=403)
            
            # Check if request is still pending
            if join_request.status != 'pending_approval':
                return Response({
                    'code': 0,
                    'message': 'This request has already been processed'
                }, status=400)
            
            # Reject the request
            join_request.status = 'rejected'
            join_request.save()
            
            # Create notification for the requester
            NotificationModel.create_join_response_notification(
                recipient=join_request.member,
                sender=member,
                booking=join_request.original_booking,
                is_approved=False
            )
            
            return Response({
                'code': 1,
                'message': 'Join request rejected successfully',
                'data': {
                    'requestId': join_request.request_id,
                    'originalBookingId': join_request.original_booking.booking_id
                }
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error rejecting join request')
            }, status=500)
    
    @action(detail=False, methods=['GET'])
    def statistics(self, request):
        """Get join request statistics for the current user"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
            
            # Incoming requests (for user's bookings)
            incoming_pending = JoinRequestModel.objects.filter(
                original_booking__member=member,
                status='pending_approval',
                hideStatus=0
            ).count()
            
            incoming_approved = JoinRequestModel.objects.filter(
                original_booking__member=member,
                status='approved',
                hideStatus=0
            ).count()
            
            incoming_rejected = JoinRequestModel.objects.filter(
                original_booking__member=member,
                status='rejected',
                hideStatus=0
            ).count()
            
            # Outgoing requests (made by user)
            outgoing_pending = JoinRequestModel.objects.filter(
                member=member,
                status='pending_approval',
                hideStatus=0
            ).count()
            
            outgoing_approved = JoinRequestModel.objects.filter(
                member=member,
                status='approved',
                hideStatus=0
            ).count()
            
            outgoing_rejected = JoinRequestModel.objects.filter(
                member=member,
                status='rejected',
                hideStatus=0
            ).count()
            
            return Response({
                'code': 1,
                'message': 'Join request statistics retrieved successfully',
                'data': {
                    'incoming': {
                        'pending': incoming_pending,
                        'approved': incoming_approved,
                        'rejected': incoming_rejected,
                        'total': incoming_pending + incoming_approved + incoming_rejected
                    },
                    'outgoing': {
                        'pending': outgoing_pending,
                        'approved': outgoing_approved,
                        'rejected': outgoing_rejected,
                        'total': outgoing_pending + outgoing_approved + outgoing_rejected
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': safe_error(e, 'Error retrieving statistics')
            }, status=500)


# Known admin-managed settings and whether each is stored encrypted.
KNOWN_SETTINGS = {
    'SMTP_HOST': False,
    'SMTP_PORT': False,
    'SMTP_USERNAME': False,
    'SMTP_PASSWORD': True,
    'SMTP_USE_TLS': False,
    'SMTP_FROM_EMAIL': False,
    'TINYMCE_API_KEY': True,
}


class SystemSettingsViewSet(ActionPermissionMixin, viewsets.ViewSet):
    """Admin-only endpoint to read/update the DB-backed settings (SMTP, API keys).

    GET  /apis/system-settings/            -> list of {key, is_secret, value, description}
                                              (secret values are returned blank)
    PUT  /apis/system-settings/update/     -> body {key: value, ...}
                                              (a blank/absent secret keeps the stored value)
    """
    permission_map = {
        'list': [IsAdmin],
        'update_settings': [IsAdmin],
    }
    default_permissions = [IsAdmin]

    def list(self, request):
        from .models import SystemSetting
        rows = {
            s.key: s for s in SystemSetting.objects.filter(
                key__in=KNOWN_SETTINGS.keys()
            )
        }
        data = []
        for key, is_secret in KNOWN_SETTINGS.items():
            obj = rows.get(key)
            data.append({
                'key': key,
                'value': '' if (is_secret or obj is None) else obj.value,
                'is_secret': is_secret,
                'description': obj.description if obj else '',
            })
        return Response({'code': 1, 'data': data})

    @action(detail=False, methods=['put'], url_path='update')
    def update_settings(self, request):
        from .models import SystemSetting
        from .system_settings import set_setting

        payload = request.data or {}
        if not isinstance(payload, dict):
            return Response(
                {'code': 0, 'message': 'Expected an object of {key: value}'},
                status=400,
            )

        for key, value in payload.items():
            if key not in KNOWN_SETTINGS:
                return Response(
                    {'code': 0, 'message': f'Unknown setting key: {key}'},
                    status=400,
                )
            if not isinstance(value, str):
                return Response(
                    {'code': 0, 'message': f'Value for {key} must be a string'},
                    status=400,
                )

        changed = []
        for key, value in payload.items():
            is_secret = KNOWN_SETTINGS[key]
            if is_secret and not value.strip():
                continue  # blank secret: keep the stored value
            set_setting(key, value.strip() if not is_secret else value,
                        is_secret=is_secret)
            changed.append(key)

        return Response({'code': 1, 'message': 'Settings updated', 'data': changed})

