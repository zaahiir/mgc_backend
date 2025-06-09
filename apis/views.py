from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
from django.shortcuts import render, get_object_or_404
from .serializers import *
from django.db.models import Q
from django.db import transaction
from .utils import PasswordManager
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.conf import settings
import json
import textwrap
import logging
import qrcode
import io
import base64
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.urls import reverse
from django.http import JsonResponse
from django.db.models import Prefetch
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os

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
            
            # FIXED SOLUTION 1: Create a manual JWT token with correct expiration handling
            from rest_framework_simplejwt.tokens import RefreshToken
            import datetime
            from django.conf import settings
            
            # Create the tokens manually
            refresh = RefreshToken()
            
            # Add custom claims
            refresh['user_id'] = member.id
            refresh['user_type'] = 'member'
            refresh['email'] = member.email
            
            # Fixed: Use hardcoded durations instead of trying to access settings.SIMPLE_JWT
            # Standard values for JWT tokens
            access_lifetime = datetime.timedelta(minutes=60)  # 1 hour for access token
            refresh_lifetime = datetime.timedelta(days=7)  # 7 days for refresh token
            
            # Set token expiry times
            now = datetime.datetime.now(tz=datetime.timezone.utc)
            refresh.set_exp(lifetime=refresh_lifetime)
            access_token = refresh.access_token
            access_token.set_exp(lifetime=access_lifetime)
            
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
        Logout endpoint for members
        """
        try:
            refresh_token = request.data.get('refresh_token')
            
            if not refresh_token:
                return Response({
                    'code': 0,
                    'message': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({
                'code': 1,
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': f'Logout failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['POST'])
    def password_reset(self, request):
        """
        Password reset request endpoint
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
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Generate a reset token and save it to the member record
            reset_token = str(uuid.uuid4())
            reset_token_expiry = datetime.datetime.now() + datetime.timedelta(hours=24)
            
            # Store reset token and expiry in member record
            # Note: You would need to add these fields to the MemberModel
            member.reset_token = reset_token
            member.reset_token_expiry = reset_token_expiry
            member.save()
            
            # Generate reset URL
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
            
            # Send email with reset link
            subject = 'Reset Your Golf Club Password'
            message = f'''
            Dear {member.firstName or 'Member'},

            You recently requested to reset your password for your golf club account.
            Click the link below to reset it:

            {reset_url}

            This link will expire in 24 hours.

            If you did not request a password reset, please ignore this email.

            Best regards,
            Golf Club Management
            '''
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False
            )
            
            return Response({
                'code': 1,
                'message': 'Password reset email sent'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'code': 0,
                'message': f'Password reset request failed: {str(e)}'
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
            # Create QR code URL - adjust the domain as needed
            qr_url = f"{getattr(settings, 'FRONTEND_URL', 'https://mastergolfclub.com')}/member/verify/{qr_token}"
            
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
Golf Club Management
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
    
    <p>Best regards,<br>Golf Club Management</p>
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

                # For new member, send credentials email with QR code
                if pk == "0" and member.email and plain_password:
                    logger.info(f"Sending email to new member: {member.email}")
                    
                    # Send email with credentials and QR code
                    email_sent = self.send_credentials_with_qr_email(
                        member.email,
                        member.golfClubId,
                        plain_password,  # Use the original plain password
                        member.qr_token
                    )

                    if email_sent:
                        logger.info("Email sent successfully")
                        response = {
                            'code': 1,
                            'message': "Member created successfully, credentials and QR code sent"
                        }
                    else:
                        logger.warning("Email sending failed, but member was created")
                        response = {
                            'code': 1,
                            'message': "Member created successfully, but email sending failed"
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

    @action(detail=False, methods=['GET'], url_path='last-member-id/(?P<year>[^/.]+)/(?P<month>[^/.]+)')
    def get_last_member_id(self, request, year=None, month=None):
        try:
            # Pattern to match: MGCyymm#### where yy is year and mm is month
            pattern = f'MGC{year}{month}\d{{4}}$'

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


class AmenitiesViewSet(viewsets.ModelViewSet):
    queryset = AmenitiesModel.objects.filter(hideStatus=0)
    serializer_class = AmenitiesModelSerializers

    @action(detail=False, methods=['GET'])
    def list_all(self, request):
        """Get all amenities for frontend consumption"""
        amenities = AmenitiesModel.objects.filter(hideStatus=0).order_by('id')
        serializer = AmenitiesModelSerializers(amenities, many=True, context={'request': request})
        
        # Format for frontend
        formatted_amenities = []
        for amenity in serializer.data:
            formatted_amenities.append({
                'id': amenity['id'],
                'title': amenity['amenityName'],
                'tooltip': amenity['amenityTooltip'] or amenity['amenityName'],
                'icon_svg': amenity['amenity_icon_svg'],  # Full SVG content
                'icon_path': amenity['amenity_icon_path'],  # Just the path data
                'viewbox': amenity['amenity_viewbox'],  # ViewBox for scaling
            })
        
        response = {
            'code': 1, 
            'data': formatted_amenities, 
            'message': "All Retrieved"
        }
        return Response(response)

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
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            if pk == "0":
                # Creating new amenity
                serializer = AmenitiesModelSerializers(data=request.data, context={'request': request})
            else:
                # Updating existing amenity
                instance = AmenitiesModel.objects.get(id=pk)
                serializer = AmenitiesModelSerializers(
                    instance=instance, 
                    data=request.data, 
                    context={'request': request}
                )
            
            if serializer.is_valid():
                serializer.save()
                response = {'code': 1, 'message': "Done Successfully"}
            else:
                response = {'code': 0, 'message': "Unable to Process Request", 'errors': serializer.errors}
        except AmenitiesModel.DoesNotExist:
            response = {'code': 0, 'message': "Amenity not found"}
        except Exception as e:
            response = {'code': 0, 'message': f"Error processing request: {str(e)}"}
        
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        try:
            amenity = AmenitiesModel.objects.get(id=pk)
            AmenitiesModel.objects.filter(id=pk).update(hideStatus=1)
            response = {'code': 1, 'message': "Done Successfully"}
        except AmenitiesModel.DoesNotExist:
            response = {'code': 0, 'message': "Amenity not found"}
        except Exception as e:
            response = {'code': 0, 'message': f"Error deleting amenity: {str(e)}"}
            
        return Response(response)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = CourseModel.objects.filter(hideStatus=0)
    serializer_class = CourseModelSerializers

    def get_queryset(self):
        return CourseModel.objects.filter(hideStatus=0).prefetch_related('amenities').order_by('-id')

    @action(detail=False, methods=['GET'])
    def collection_data(self, request):
        """Get courses formatted for the collection component"""
        courses = self.get_queryset()
        serializer = CourseModelSerializers(courses, many=True, context={'request': request})
        
        response = {
            'code': 1, 
            'data': serializer.data, 
            'message': "Collection data retrieved successfully",
            'total': courses.count()
        }
        return Response(response)

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            queryset = self.get_queryset()
        else:
            queryset = CourseModel.objects.filter(hideStatus=0, id=pk).prefetch_related('amenities')

        serializer = CourseModelSerializers(queryset, many=True, context={'request': request})
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

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
            if 'amenities' in data and isinstance(data['amenities'], str):
                try:
                    data['amenities'] = json.loads(data['amenities'])
                except json.JSONDecodeError:
                    data['amenities'] = []

            serializer = CourseCreateUpdateSerializer(
                instance=instance,
                data=data,
                context={'request': request}
            )

            if serializer.is_valid():
                course = serializer.save()
                
                # Handle amenities separately if provided
                if 'amenities' in data:
                    course.amenities.set(data['amenities'])

                # Return the course data in the format expected by frontend
                response_serializer = CourseModelSerializers(course, context={'request': request})
                response = {
                    'code': 1,
                    'message': "Done Successfully",
                    'data': response_serializer.data
                }
                return Response(response)
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
            response = {'code': 1, 'message': "Done Successfully"}
            return Response(response)
        except Exception as e:
            return Response({
                'code': 0,
                'message': f"Error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'])
    def search(self, request):
        """Search courses by name, location, or amenities"""
        query = request.query_params.get('q', '')
        location = request.query_params.get('location', '')
        amenity_ids = request.query_params.getlist('amenities[]')

        queryset = self.get_queryset()

        if query:
            queryset = queryset.filter(courseName__icontains=query)
        
        if location:
            queryset = queryset.filter(
                models.Q(town__icontains=location) |
                models.Q(locality__icontains=location) |
                models.Q(golfLocation__icontains=location)
            )
        
        if amenity_ids:
            queryset = queryset.filter(amenities__id__in=amenity_ids).distinct()

        serializer = CourseModelSerializers(queryset, many=True, context={'request': request})
        
        response = {
            'code': 1,
            'data': serializer.data,
            'message': "Search results retrieved",
            'total': queryset.count()
        }
        return Response(response)
    

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


class MemberEnquiryViewSet(viewsets.ModelViewSet):
    queryset = MemberEnquiryModel.objects.filter(hideStatus=0)
    serializer_class = MemberEnquiryModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = MemberEnquiryModelSerializers(MemberEnquiryModel.objects.filter(hideStatus=0).order_by('-id'),
                                                       many=True)
        else:
            serializer = MemberEnquiryModelSerializers(
                MemberEnquiryModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = MemberEnquiryModelSerializers(data=request.data)
        else:
            serializer = MemberEnquiryModelSerializers(instance=MemberEnquiryModel.objects.get(id=pk),
                                                       data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        MemberEnquiryModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)


def index_view(request):
    courses = CourseModel.objects.filter(hideStatus=0).order_by('-createdAt')
    blogs = BlogModel.objects.filter(hideStatus=0).order_by('-createdAt')
    concept = ConceptModel.get_solo()

    context = {
        'courses': courses,
        'blogs': blogs,
        'concepts': [concept]
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
