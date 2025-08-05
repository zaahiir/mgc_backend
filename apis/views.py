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
from django.db.models import Q
from django.db import transaction
from .utils import PasswordManager
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.conf import settings
from datetime import datetime, timedelta
import datetime as dt
import json
import logging
import qrcode
import io
from django.core.mail import EmailMultiAlternatives
import os
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
import json
import random
import string
import qrcode
from io import BytesIO
import base64
from .models import *
from .serializers import *

logger = logging.getLogger(__name__)
 

class UserViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"detail": "Username and password are required"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Authenticate only superuser
        user = authenticate(username=username, password=password)

        if user and user.is_superuser:
            tokens = RefreshToken.for_user(user)
            return Response({
                'refresh': str(tokens),
                'access': str(tokens.access_token),
                'user_type': 'superuser',
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
            }, status=status.HTTP_200_OK)

        return Response(
            {"detail": "Access denied. Superuser credentials required"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if not refresh_token:
                raise ValidationError("Refresh token is required")

            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logout successful"}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"detail": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": "Logout failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
      
    @action(detail=False, methods=['POST'])
    def member_login(self, request):
        """
        Login endpoint for members using username (email) and password
        """
        try:
            data = request.data
            
            # Validate request data
            if not data.get('username') or not data.get('password'):
                return Response({
                    'code': 0,
                    'message': 'Username and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find member by username/email
            try:
                member = MemberModel.objects.get(
                    email=data.get('username'),
                    hideStatus=0
                )
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Invalid username or password'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Verify password - improved logic
            password_manager = PasswordManager()
            input_password = data.get('password')
            authenticated = False
            
            # Try authentication using available password fields
            if member.hashed_password:
                from django.contrib.auth.hashers import check_password
                authenticated = check_password(input_password, member.hashed_password)
            
            if not authenticated and member.encrypted_password:
                try:
                    decrypted_password = password_manager.decrypt_password(member.encrypted_password)
                    authenticated = (input_password == decrypted_password)
                except Exception as e:
                    print(f"Error decrypting password: {e}")
            
            if not authenticated and member.password:
                authenticated = (input_password == member.password)
            
            if not authenticated:
                return Response({
                    'code': 0,
                    'message': 'Invalid username or password'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # FIXED: Create or get a Django User for the member to handle JWT properly
            from django.contrib.auth.models import User
            
            # Try to get or create a corresponding Django User
            django_user, created = User.objects.get_or_create(
                username=member.email,
                defaults={
                    'email': member.email,
                    'first_name': member.firstName or '',
                    'last_name': member.lastName or '',
                    'is_active': True,
                    'is_staff': False,
                    'is_superuser': False
                }
            )
            
            # Create JWT tokens using the Django User
            refresh = RefreshToken.for_user(django_user)
            
            # Add custom claims to the tokens
            refresh['member_id'] = member.id
            refresh['user_type'] = 'member'
            refresh['email'] = member.email
            
            # Add custom claims to access token too
            access_token = refresh.access_token
            access_token['member_id'] = member.id
            access_token['user_type'] = 'member'
            access_token['email'] = member.email
            
            return Response({
                'code': 1,
                'message': 'Login successful',
                'access': str(access_token),
                'refresh': str(refresh),
                'user_type': 'member',
                'user_id': member.id,
                'username': member.email,
                'email': member.email
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            print(traceback.format_exc())  # Print full traceback for debugging
            return Response({
                'code': 0,
                'message': f'Login failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    @action(detail=False, methods=['POST'])
    def member_logout(self, request):
        """
        Logout endpoint for members - FIXED VERSION
        """
        try:
            refresh_token = request.data.get('refresh_token')
            
            if not refresh_token:
                return Response({
                    'code': 0,
                    'message': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Decode the token to get user information
                from rest_framework_simplejwt.tokens import UntypedToken
                from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
                from django.contrib.auth.models import User
                
                # Validate and decode the token
                UntypedToken(refresh_token)
                
                # Create RefreshToken instance and blacklist it
                token = RefreshToken(refresh_token)
                token.blacklist()
                
                return Response({
                    'code': 1,
                    'message': 'Logout successful'
                }, status=status.HTTP_200_OK)
                
            except TokenError as e:
                return Response({
                    'code': 0,
                    'message': 'Invalid or expired token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            # If blacklisting fails, we can still consider the logout successful
            # since the token will expire naturally
            print(f"Logout error: {str(e)}")
            return Response({
                'code': 1,
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['POST'])
    def password_reset(self, request):
        """
        Password reset request endpoint - sends verification code to email
        """
        try:
            email = request.data.get('email')
            
            if not email:
                return Response({
                    'code': 0,
                    'message': 'Email is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find member by email
            try:
                member = MemberModel.objects.get(email=email, hideStatus=0)
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Email not found in our records'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Generate a 6-digit verification code
            import random
            import datetime
            from django.conf import settings
            from django.core.mail import send_mail
            
            verification_code = str(random.randint(100000, 999999))
            reset_token_expiry = dt.datetime.now() + dt.timedelta(hours=1)  # 1 hour expiry
            
            # Store verification code and expiry in member record
            member.reset_token = verification_code  # Using reset_token field to store verification code
            member.reset_token_expiry = reset_token_expiry
            member.save()
            
            # Send email with verification code
            subject = 'Password Reset - Verification Code'
            message = f'''
    Dear {member.firstName or 'Member'},

    You have requested to reset your password for your Golf Club account.

    Your verification code is: {verification_code}

    This code will expire in 1 hour.

    If you did not request a password reset, please ignore this email.

    Best regards,
    Master Golf Club Management
            '''
            
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False
                )
                
                # For development/testing purposes, you can return the code
                # Remove this in production
                development_response = {
                    'code': 1,
                    'message': 'Verification code sent to your email address'
                }
                
                # Only include verification_code in development
                if settings.DEBUG:
                    development_response['verification_code'] = verification_code
                    
                return Response(development_response, status=status.HTTP_200_OK)
                
            except Exception as email_error:
                return Response({
                    'code': 0,
                    'message': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({
                'code': 0,
                'message': f'Password reset request failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def verify_reset_code(self, request):
        """
        Verify reset code without setting password
        """
        try:
            verification_code = request.data.get('verification_code')
            
            if not verification_code:
                return Response({
                    'code': 0,
                    'message': 'Verification code is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find member by verification code
            try:
                member = MemberModel.objects.get(
                    reset_token=verification_code,
                    reset_token_expiry__gt=dt.datetime.now(),
                    hideStatus=0
                )
                return Response({
                    'code': 1,
                    'message': 'Verification code is valid'
                }, status=status.HTTP_200_OK)
                
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Invalid or expired verification code'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'code': 0,
                'message': f'Verification failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def set_new_password(self, request):
        """
        Set new password using verification code
        """
        try:
            verification_code = request.data.get('verification_code')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            if not all([verification_code, new_password, confirm_password]):
                return Response({
                    'code': 0,
                    'message': 'Verification code, new password, and confirmation are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if new_password != confirm_password:
                return Response({
                    'code': 0,
                    'message': 'Passwords do not match'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(new_password) < 8:
                return Response({
                    'code': 0,
                    'message': 'Password must be at least 8 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find member by verification code
            try:
                member = MemberModel.objects.get(
                    reset_token=verification_code,
                    reset_token_expiry__gt=dt.datetime.now(),
                    hideStatus=0
                )
            except MemberModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Invalid or expired verification code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            from django.contrib.auth.hashers import make_password
            password_manager = PasswordManager()
            
            # Hash the new password
            member.hashed_password = make_password(new_password)
            # Also encrypt it for compatibility
            member.encrypted_password = password_manager.encrypt_password(new_password)
            # Clear the old plain text password
            member.password = None
            # Clear reset token
            member.reset_token = None
            member.reset_token_expiry = None
            member.save()
            
            # Also update the corresponding Django User password if it exists
            try:
                from django.contrib.auth.models import User
                django_user = User.objects.get(username=member.email)
                django_user.set_password(new_password)
                django_user.save()
            except User.DoesNotExist:
                pass  # Django user doesn't exist, which is fine
            
            return Response({
                'code': 1,
                'message': 'Password has been reset successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': f'Password reset failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserTypeViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        UserTypeModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class CountryViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        CountryModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PaymentMethodViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PaymentMethodModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PaymentStatusViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PaymentStatusModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class GenderViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        GenderModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PlanTypeViewSet(viewsets.ModelViewSet):
    queryset = PlanTypeModel.objects.filter(hideStatus=0)
    serializer_class = PlanTypeModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PlanTypeModelSerializers(PlanTypeModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = PlanTypeModelSerializers(PlanTypeModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                                  many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PlanTypeModelSerializers(data=request.data)
        else:
            serializer = PlanTypeModelSerializers(instance=PlanTypeModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PlanTypeModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PlanDurationViewSet(viewsets.ModelViewSet):
    queryset = PlanDurationModel.objects.filter(hideStatus=0)
    serializer_class = PlanDurationModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PlanDurationModelSerializers(PlanDurationModel.objects.filter(hideStatus=0).order_by('-id'),
                                                      many=True)
        else:
            serializer = PlanDurationModelSerializers(
                PlanDurationModel.objects.filter(hideStatus=0, id=pk).order_by('-id'), many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PlanDurationModelSerializers(data=request.data)
        else:
            serializer = PlanDurationModelSerializers(instance=PlanDurationModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PlanDurationModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PlanCycleViewSet(viewsets.ModelViewSet):
    queryset = PlanCycleModel.objects.filter(hideStatus=0)
    serializer_class = PlanCycleModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = PlanCycleModelSerializers(PlanCycleModel.objects.filter(hideStatus=0).order_by('-id'),
                                                   many=True)
        else:
            serializer = PlanCycleModelSerializers(PlanCycleModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                                   many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = PlanCycleModelSerializers(data=request.data)
        else:
            serializer = PlanCycleModelSerializers(instance=PlanCycleModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PlanCycleModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class PlanViewSet(viewsets.ModelViewSet):
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
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        PlanModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class MemberViewSet(viewsets.ModelViewSet):
    queryset = MemberModel.objects.filter(hideStatus=0)
    serializer_class = MemberModelSerializers

    def generate_qr_code(self, qr_token: str):
        """
        Generate QR code for member verification
        """
        try:
            # FIXED: Use mastergolfclub.com instead of mastergolfclub.com for QR code URLs
            qr_url = f"https://mastergolfclub.com/member/verify/{qr_token}/"
            
            logger.info(f"Generating QR code for URL: {qr_url}")
            
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
            
            logger.info("QR code generated successfully")
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"QR Code generation error: {str(e)}")
            return None

    def send_credentials_with_qr_email(self, email: str, member_id: str, password: str, qr_token: str):
        """
        Send email with credentials and QR code to new member
        """
        try:
            logger.info(f"Attempting to send email to: {email}")
            
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

            # Create email message
            msg = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [email]
            )
            
            # Add HTML version
            msg.attach_alternative(html_message, "text/html")
            
            # Attach QR code
            msg.attach(f'membership_qr_{member_id}.png', qr_image_data, 'image/png')
            
            logger.info("Attempting to send email...")
            
            # Send email
            msg.send()
            
            logger.info("Email sent successfully")
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
            password_manager = PasswordManager()
            plain_password = None

            # If this is a new member creation
            if pk == "0" and 'password' in data:
                plain_password = data['password']
                # Get both encrypted and hashed versions
                encrypted_pwd, hashed_pwd = password_manager.encrypt_password(plain_password)

                # Update data with encrypted and hashed passwords
                data['encrypted_password'] = encrypted_pwd
                data['hashed_password'] = hashed_pwd
                # Remove plain password from data
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
                logger.info(f"Member saved with ID: {member.id}, QR Token: {member.qr_token}")

                # For new member, log credentials instead of sending email (for localhost development)
                if pk == "0" and member.email and plain_password:
                    logger.info(f"=== NEW MEMBER CREATED ===")
                    logger.info(f"Email: {member.email}")
                    logger.info(f"Password: {plain_password}")
                    logger.info(f"Member ID: {member.golfClubId}")
                    logger.info(f"QR Token: {member.qr_token}")
                    logger.info(f"Full Name: {member.firstName} {member.lastName}")
                    logger.info(f"Phone: {member.phoneNumber}")
                    logger.info("==========================")
                    
                    response = {
                        'code': 1,
                        'message': "Member created successfully. Check terminal for credentials.",
                        'data': {
                            'member_id': member.golfClubId,
                            'email': member.email,
                            'password': plain_password,
                            'qr_token': member.qr_token
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
            response = {'code': 0, 'message': str(e)}

        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        MemberModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)

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

            logger.info(f"Profile retrieved successfully for member ID: {member.id}")
            
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
                'message': f'Error retrieving profile: {str(e)}',
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

            # Update the member with provided data
            serializer = MemberModelSerializers(
                instance=member,
                data=request.data,
                partial=True  # Allow partial updates
            )

            if serializer.is_valid():
                updated_member = serializer.save()
                logger.info(f"Profile updated successfully for member ID: {updated_member.id}")
                
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
                'message': f'Error updating profile: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ADD: New method for current user profile (if you have authentication)
    @action(detail=False, methods=['GET'], url_path='current-profile')
    def get_current_profile(self, request):
        """
        Get current authenticated user's profile
        URL: /apis/member/current-profile/
        """
        try:
            # Get user ID from the authenticated user
            user_id = request.user.id if hasattr(request.user, 'id') else None
            
            # Alternative: Get user ID from JWT token or session
            if not user_id:
                user_id = request.META.get('HTTP_USER_ID')
                if user_id:
                    user_id = int(user_id)
            
            # Alternative: Get from query parameter
            if not user_id:
                user_id = request.query_params.get('user_id')
                if user_id:
                    user_id = int(user_id)
            
            if not user_id:
                return Response({
                    'code': 0,
                    'message': 'User authentication required',
                    'data': None
                }, status=status.HTTP_401_UNAUTHORIZED)

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
                'message': f'Error retrieving profile: {str(e)}',
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # FIXED: Changed the URL pattern to match what's used in the HTML template
    @action(detail=False, methods=['GET'], url_path='verify-qr/(?P<qr_token>[^/.]+)')
    def verify_qr_code(self, request, qr_token=None):
        """
        Verify QR code and return member details
        """
        try:
            logger.info(f"Attempting to verify QR token: {qr_token}")
            
            # Find member by QR token
            member = MemberModel.objects.get(qr_token=qr_token, hideStatus=0)
            
            logger.info(f"Member found: {member.firstName} {member.lastName}")
            
            # Serialize member data
            serializer = MemberQRDetailSerializer(member, context={'request': request})
            
            response = {
                'code': 1,
                'data': serializer.data,
                'message': 'Member details retrieved successfully'
            }
            
            logger.info("QR verification successful")
            return Response(response)
            
        except MemberModel.DoesNotExist:
            logger.error(f"Member not found for QR token: {qr_token}")
            return Response({
                'code': 0,
                'message': 'Invalid QR code or member not found'
            }, status=404)
            
        except Exception as e:
            logger.error(f"Error verifying QR code: {str(e)}")
            return Response({
                'code': 0,
                'message': f'Error verifying QR code: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['POST'], url_path='create-sample-members')
    def create_sample_members(self, request):
        """
        Create 10 sample members for testing purposes
        """
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
            password_manager = PasswordManager()
            
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
                
                # Encrypt password
                encrypted_pwd, hashed_pwd = password_manager.encrypt_password(member_data['password'])
                member_data['encrypted_password'] = encrypted_pwd
                member_data['hashed_password'] = hashed_pwd
                member_data.pop('password', None)
                
                # Create member
                serializer = MemberModelSerializers(data=member_data)
                if serializer.is_valid():
                    member = serializer.save()
                    
                    # Log credentials
                    logger.info(f"=== SAMPLE MEMBER {i} CREATED ===")
                    logger.info(f"Email: {member.email}")
                    logger.info(f"Password: password{i}")
                    logger.info(f"Member ID: {member.golfClubId}")
                    logger.info(f"Full Name: {member.firstName} {member.lastName}")
                    logger.info(f"Phone: {member.phoneNumber}")
                    logger.info("================================")
                    
                    created_members.append({
                        'id': member.id,
                        'golfClubId': member.golfClubId,
                        'email': member.email,
                        'password': f"password{i}",
                        'fullName': f"{member.firstName} {member.lastName}",
                        'phone': member.phoneNumber
                    })
                else:
                    logger.error(f"Failed to create sample member {i}: {serializer.errors}")
            
            logger.info(f"=== SAMPLE MEMBERS SUMMARY ===")
            logger.info(f"Total created: {len(created_members)}")
            logger.info("===============================")
            
            return Response({
                'code': 1,
                'message': f"Successfully created {len(created_members)} sample members",
                'data': created_members
            })
            
        except Exception as e:
            logger.error(f"Error creating sample members: {str(e)}")
            return Response({
                'code': 0,
                'message': f"Error creating sample members: {str(e)}"
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
                'message': f'Error retrieving last member ID: {str(e)}'
            }, status=500)

    @action(detail=True, methods=['GET'], url_path='qr-code')
    def get_member_qr_code(self, request, pk=None):
        """
        Get QR code for a specific member
        """
        try:
            logger.info(f"Fetching QR code for member ID: {pk}")
            
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
            
            logger.info(f"QR code generated successfully for member {pk}")
            
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
                'message': f'Error generating QR code: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['GET'], url_path='current-qr-code')
    def get_current_member_qr_code(self, request):
        """
        Get QR code for the currently authenticated member
        """
        try:
            # Get current user's member profile
            user_id = request.user.id if request.user.is_authenticated else None
            
            if not user_id:
                return Response({
                    'code': 0,
                    'message': 'User not authenticated'
                }, status=401)
            
            # Find member by user ID or email
            try:
                member = MemberModel.objects.get(id=user_id, hideStatus=0)
            except MemberModel.DoesNotExist:
                # Try to find by email if user ID doesn't match
                if hasattr(request.user, 'email'):
                    member = MemberModel.objects.get(email=request.user.email, hideStatus=0)
                else:
                    raise MemberModel.DoesNotExist
            
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
            
            logger.info(f"QR code generated successfully for current member {member.id}")
            
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
                'message': f'Error generating QR code: {str(e)}'
            }, status=500)




class AmenitiesViewSet(viewsets.ModelViewSet):
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
            return Response({'code': 0, 'message': f"Error processing request: {str(e)}"})

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        try:
            AmenitiesModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Done Successfully"})
        except Exception as e:
            return Response({'code': 0, 'message': f"Error deleting amenity: {str(e)}"})


class CollectionViewSet(viewsets.ModelViewSet):
    """Optimized ViewSet for collection view with minimal data"""
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


class CourseManagementViewSet(viewsets.ModelViewSet):
    """ViewSet for course management (admin operations)"""
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
            if 'courseAmenities' in data and isinstance(data['courseAmenities'], str):
                try:
                    data['courseAmenities'] = json.loads(data['courseAmenities'])
                except json.JSONDecodeError:
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
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        try:
            CourseModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Done Successfully"})
        except Exception as e:
            return Response({
                'code': 0,
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

class TeeViewSet(viewsets.ModelViewSet):
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
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        try:
            TeeModel.objects.filter(id=pk).update(hideStatus=1)
            return Response({'code': 1, 'message': "Tee deleted successfully"})
        except Exception as e:
            return Response({
                'code': 0,
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def by_course(self, request):
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response({'error': 'course_id parameter required'}, status=400)
        
        tees = self.get_queryset().filter(course_id=course_id)
        serializer = self.get_serializer(tees, many=True)
        return Response({
            'code': 1,
            'data': serializer.data,
            'message': 'Tees retrieved successfully'
        })

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get bookings for the authenticated member"""
        try:
            member = MemberModel.objects.get(email=self.request.user.email)
            return BookingModel.objects.filter(
                member=member,
                hideStatus=0
            ).order_by('-createdAt')
        except MemberModel.DoesNotExist:
            return BookingModel.objects.none()

    def create(self, request, *args, **kwargs):
        """Create a new booking with automatic member assignment and booking ID generation"""
        try:
            member = MemberModel.objects.get(email=request.user.email)
            
            # Generate unique booking ID
            booking_id = self.generate_booking_id()
            
            # Add member and booking ID to request data
            data = request.data.copy()
            data['member'] = member.id
            data['booking_id'] = booking_id
            
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
                    'bookingId': booking_id,
                    'courseName': booking.course.courseName,
                    'teeLabel': f"{booking.tee.holeNumber} Holes",
                    'date': booking.bookingDate,
                    'time': booking.bookingTime.strftime('%I:%M %p'),
                    'participants': booking.participants,
                    'status': booking.status
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
                'message': str(e)
            }, status=400)

    def generate_booking_id(self):
        """Generate unique booking ID in format: MGCBK25AUG05001"""
        from datetime import datetime
        import random
        
        now = datetime.now()
        year_suffix = str(now.year)[-2:]  # Last 2 digits of year
        month_abbr = now.strftime('%b').upper()  # 3-letter month
        day = f"{now.day:02d}"  # 2-digit day
        
        base_id = f"MGCBK{year_suffix}{month_abbr}{day}"
        
        # Check if this ID already exists today
        existing_count = BookingModel.objects.filter(
            booking_id__startswith=base_id
        ).count()
        
        if existing_count > 0:
            # Append counter to make it unique (001, 002, etc.)
            base_id = f"{base_id}{(existing_count + 1):03d}"
        else:
            # First booking of the day gets 001
            base_id = f"{base_id}001"
        
        return base_id

    @action(detail=True, methods=['patch'])
    def cancel_booking(self, request, pk=None):
        """Cancel a booking"""
        try:
            booking = self.get_object()
            
            if not booking.can_cancel:
                return Response({
                    'code': 0,
                    'message': 'Cannot cancel booking within 24 hours of tee time'
                }, status=400)
            
            booking.status = 'cancelled'
            booking.save()
            
            return Response({
                'code': 1,
                'message': 'Booking cancelled successfully'
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': str(e)
            }, status=400)

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
            try:
                join_request = BookingModel.objects.get(
                    id=join_request_id,
                    original_booking=original_booking,
                    is_join_request=True,
                    status='pending_approval'
                )
            except BookingModel.DoesNotExist:
                return Response({
                    'code': 0,
                    'message': 'Join request not found'
                }, status=404)
            
            # Check if slot can accommodate the join request
            total_participants = original_booking.slot_participant_count + join_request.participants
            if total_participants > 4:
                return Response({
                    'code': 0,
                    'message': 'Slot cannot accommodate additional participants'
                }, status=400)
            
            # Approve the join request
            join_request.status = 'approved'
            join_request.save()
            
            # Create notification for the joining member
            NotificationModel.create_join_response_notification(
                recipient=join_request.member,
                sender=original_booking.member,
                booking=original_booking,
                is_approved=True
            )
            
            return Response({
                'code': 1,
                'message': 'Join request approved successfully'
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': str(e)
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
            try:
                join_request = BookingModel.objects.get(
                    id=join_request_id,
                    original_booking=original_booking,
                    is_join_request=True,
                    status='pending_approval'
                )
            except BookingModel.DoesNotExist:
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
                'message': str(e)
            }, status=400)

    @action(detail=False, methods=['get'], permission_classes=[])
    def available_slots(self, request):
        """Get available time slots for a course, date, and tee"""
        try:
            course_id = request.query_params.get('course_id')
            date_str = request.query_params.get('date')
            tee_id = request.query_params.get('tee_id')
            participants = int(request.query_params.get('participants', 1))
            timezone_offset = request.query_params.get('timezone_offset')
            
            if not all([course_id, date_str, tee_id]):
                return Response({
                    'code': 0,
                    'message': 'Course ID, date, and tee ID are required'
                }, status=400)
            
            # Parse date
            from datetime import datetime
            booking_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Get course and tee
            try:
                course = CourseModel.objects.get(id=course_id, hideStatus=0)
                tee = TeeModel.objects.get(id=tee_id, course=course, hideStatus=0)
            except (CourseModel.DoesNotExist, TeeModel.DoesNotExist):
                return Response({
                    'code': 0,
                    'message': 'Course or tee not found'
                }, status=404)
            
            # Generate time slots with timezone consideration
            slots = self.generate_time_slots(course, booking_date, tee, participants, timezone_offset)
            
            return Response({
                'code': 1,
                'message': 'Time slots retrieved successfully',
                'data': slots
            })
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': str(e)
            }, status=400)

    def generate_time_slots(self, course, booking_date, tee, requested_participants, timezone_offset=None):
        """Generate time slots dynamically based on course opening time and slot duration"""
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
        
        # Only for today, start from current time rounded to next slot
        if booking_date == timezone.now().date():
            # Adjust for timezone if provided
            if timezone_offset is not None:
                try:
                    offset_minutes = int(timezone_offset)
                    # Adjust the current time by the timezone offset
                    now = timezone.now() + timedelta(minutes=offset_minutes)
                    print(f"Timezone offset: {offset_minutes} minutes, Adjusted time: {now}")
                except (ValueError, TypeError):
                    now = timezone.now()
                    print(f"Invalid timezone offset: {timezone_offset}, using server time: {now}")
            else:
                now = timezone.now()
                print(f"No timezone offset provided, using server time: {now}")
                
            if current_time < now:
                # Round up to next 8-minute slot
                minutes_since_open = (now - timezone.make_aware(datetime.combine(booking_date, open_time))).total_seconds() / 60
                slots_since_open = int(minutes_since_open / slot_duration) + 1
                current_time = timezone.make_aware(datetime.combine(booking_date, open_time)) + timedelta(minutes=slots_since_open * slot_duration)
                
                # Ensure we don't start before the open time
                if current_time.time() < open_time:
                    current_time = timezone.make_aware(datetime.combine(booking_date, open_time))
                
                print(f"Today's booking - starting from: {current_time.time()}")
            else:
                print(f"Today's booking - using open time: {current_time.time()}")
        else:
            # For all future dates (including tomorrow), start from the course opening time
            current_time = timezone.make_aware(datetime.combine(booking_date, open_time))
            print(f"Future date {booking_date} - using open time: {current_time.time()}")
        
        while current_time.time() <= close_time:
            slot_time = current_time.time()
            formatted_time = slot_time.strftime('%I:%M %p')
            
            # Get existing bookings for this slot and specific tee
            existing_bookings = BookingModel.objects.filter(
                course=course,
                tee=tee,
                bookingDate=booking_date,
                bookingTime=slot_time,
                status__in=['confirmed', 'pending'],
                is_join_request=False
            )
            
            # Calculate total participants in this slot
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
                        booking_details.append({
                            'booking_id': booking.id,
                            'member_name': f"{booking.member.firstName} {booking.member.lastName}",
                            'participants': booking.participants,
                            'status': booking.status,
                            'hole_number': booking.tee.holeNumber,
                            'start_time': booking.bookingTime.strftime('%I:%M %p'),
                            'end_time': booking.end_time.strftime('%I:%M %p')
                        })
                
                slots.append({
                    'time': slot_time.strftime('%H:%M'),
                    'available': True,
                    'formatted_time': formatted_time,
                    'slot_status': slot_status,
                    'available_spots': available_spots,
                    'total_participants': total_participants,
                    'bookings': booking_details,
                    'booking_count': len(booking_details)
                })
            
            # Move to next slot (8 minutes later)
            current_time += timedelta(minutes=slot_duration)
        
        return slots


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notifications"""
    serializer_class = NotificationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
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
                'message': f'Error marking notification as read: {str(e)}'
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


class BlogViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        BlogModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


class ConceptViewSet(viewsets.ModelViewSet):
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
                'message': str(e)
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
                'message': f"Error: {str(e)}"
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
                'message': f"Error: {str(e)}"
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
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactEnquiryViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=['GET'])
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


class MemberEnquiryViewSet(viewsets.ModelViewSet):
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
            response = {'code': 0, 'message': f"Error retrieving enquiries: {str(e)}"}
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
                
                # Log the conversion update if this is a conversion
                if data.get('isConverted', False):
                    logger.info(f"Enquiry {enquiry.id} marked as converted to member {data.get('convertedMemberId', 'Unknown')}")
                
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
            response = {'code': 0, 'message': f"Error: {str(e)}"}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'], url_path='deletion/(?P<enquiry_id>[^/.]+)')
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
                logger.info(f"Enquiry {enquiry_id} soft deleted successfully")
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
            response = {'code': 0, 'message': f"Error: {str(e)}"}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'], url_path='mark-converted/(?P<enquiry_id>[^/.]+)')
    def mark_converted(self, request, enquiry_id=None):
        """
        Mark an enquiry as converted to member
        URL: /apis/memberEnquiry/mark-converted/{id}/
        Expected data: {'convertedMemberId': 'MEMBER_ID'}
        """
        try:
            logger.info(f"Received request to mark enquiry {enquiry_id} as converted")
            logger.info(f"Request data: {request.data}")
            
            enquiry = get_object_or_404(MemberEnquiryModel, id=enquiry_id, hideStatus=0)
            logger.info(f"Found enquiry: {enquiry.id}, current status: converted={enquiry.is_converted}")
            
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
            enquiry.converted_date = timezone.now()
            
            # FIXED: Use update_fields to ensure the save operation only updates these specific fields
            enquiry.save(update_fields=['is_converted', 'converted_member_id', 'converted_date'])
            
            # FIXED: Verify the update was successful by reloading from database
            enquiry.refresh_from_db()
            
            logger.info(f"Enquiry {enquiry_id} successfully marked as converted to member {converted_member_id}")
            logger.info(f"Verification - enquiry.is_converted: {enquiry.is_converted}, enquiry.converted_member_id: {enquiry.converted_member_id}")
            
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
            response = {'code': 0, 'message': f"Error: {str(e)}"}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AboutViewSet(viewsets.ModelViewSet):
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
                'message': str(e)
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
                'message': str(e)
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
                'message': str(e)
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
                'message': str(e)
            }, status=500)

    @action(detail=True, methods=['GET'])
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
                'message': str(e)
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


class EventViewSet(viewsets.ModelViewSet):
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
                'message': str(e)
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
            print(f"Error in event processing: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({
                'status': 'error',
                'message': f"Error processing event: {str(e)}"
            }, status=500)
    
    @action(detail=True, methods=['GET'])
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
                'message': str(e)
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
                'message': f'Error retrieving events: {str(e)}'
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
                'message': f'Error retrieving event details: {str(e)}'
            }, status=500)


class EventInterestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing event interests"""
    serializer_class = EventInterestSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
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
                'message': f'Error retrieving member interests: {str(e)}'
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


class ProtocolViewSet(viewsets.ModelViewSet):
    """ViewSet for managing protocols"""
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
                'message': str(e)
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
                'message': str(e)
            }, status=400)

    @action(detail=True, methods=['GET'])
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
                'message': str(e)
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
                'message': str(e)
            }, status=400)


class InstructorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing instructors"""
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
                'message': str(e)
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
                'message': str(e)
            }, status=400)

    @action(detail=True, methods=['GET'])
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
                'message': str(e)
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
            response = {'code': 0, 'message': f"Error retrieving instructors: {str(e)}"}
            return Response(response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing messages"""
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

    @action(detail=False, methods=['GET'], url_path='deletion/(?P<message_id>[^/.]+)')
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


class FAQViewSet(viewsets.ModelViewSet):
    """ViewSet for managing FAQs"""
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

    @action(detail=True, methods=['GET'])
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

