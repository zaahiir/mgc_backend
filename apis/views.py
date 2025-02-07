from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.exceptions import ValidationError
from django.shortcuts import render
from .serializers import *
from django.db.models import Q
from .utils import PasswordManager
from django.core.mail import send_mail
from django.conf import settings
import json


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


class AmenitiesViewSet(viewsets.ModelViewSet):
    queryset = AmenitiesModel.objects.filter(hideStatus=0)
    serializer_class = AmenitiesModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = AmenitiesModelSerializers(AmenitiesModel.objects.filter(hideStatus=0).order_by('-id'),
                                                   many=True)
        else:
            serializer = AmenitiesModelSerializers(AmenitiesModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                                   many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = AmenitiesModelSerializers(data=request.data)
        else:
            serializer = AmenitiesModelSerializers(instance=AmenitiesModel.objects.get(id=pk), data=request.data)
        if serializer.is_valid():
            serializer.save()
            response = {'code': 1, 'message': "Done Successfully"}
        else:
            response = {'code': 0, 'message': "Unable to Process Request"}
        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        AmenitiesModel.objects.filter(id=pk).update(hideStatus=1)
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

    def send_credentials_email(self, email: str, member_id: str, password: str):
        """
        Send email with credentials to new member
        """
        subject = 'Your Golf Club Membership Credentials'
        message = f'''
        Dear Member,

        Your golf club membership account has been created successfully.

        Your membership details:
        Member ID: {member_id}

        Login credentials:
        Username: {email}
        Password: {password}

        Please change your password upon first login.

        Best regards,
        Golf Club Management
        '''

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Email sending error: {e}")
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

                # For new member, send credentials email
                if pk == "0" and member.email and member.encrypted_password:
                    # Decrypt password for email
                    decrypted_password = password_manager.decrypt_password(
                        member.encrypted_password
                    )

                    # Send email with credentials
                    email_sent = self.send_credentials_email(
                        member.email,
                        member.golfClubId,
                        decrypted_password
                    )

                    if not email_sent:
                        raise Exception("Failed to send credentials email")

                response = {
                    'code': 1,
                    'message': "Member created successfully and credentials sent"
                }
            else:
                response = {
                    'code': 0,
                    'message': "Unable to Process Request",
                    'errors': serializer.errors
                }

        except Exception as e:
            response = {'code': 0, 'message': str(e)}

        return Response(response)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        MemberModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
        return Response(response)

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


class CourseViewSet(viewsets.ModelViewSet):
    queryset = CourseModel.objects.filter(hideStatus=0)
    serializer_class = CourseModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            queryset = CourseModel.objects.filter(hideStatus=0).order_by('-id')
        else:
            queryset = CourseModel.objects.filter(hideStatus=0, id=pk).order_by('-id')

        queryset = queryset.prefetch_related('amenities')
        serializer = CourseModelSerializers(queryset, many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        try:
            instance = None if pk == "0" else CourseModel.objects.get(id=pk)

            # Convert request.data to mutable dictionary
            data = request.data.dict() if hasattr(request.data, 'dict') else request.data

            # Parse amenities from JSON string
            if 'amenities' in data:
                data['amenities'] = json.loads(data['amenities'])

            serializer = CourseModelSerializers(
                instance=instance,
                data=data,
                context={'request': request}
            )

            if serializer.is_valid():
                course = serializer.save()
                if 'amenities' in data:
                    course.amenities.set(data['amenities'])
                response = {
                    'code': 1,
                    'message': "Done Successfully",
                    'data': CourseModelSerializers(course).data
                }
                return Response(response)
            else:
                return Response({
                    'code': 0,
                    'message': "Validation Error",
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'code': 0,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['GET'])
    def deletion(self, request, pk=None):
        CourseModel.objects.filter(id=pk).update(hideStatus=1)
        response = {'code': 1, 'message': "Done Successfully"}
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


class ContactEnquiryViewSet(viewsets.ModelViewSet):
    queryset = ContactEnquiryModel.objects.filter(hideStatus=0)
    serializer_class = ContactEnquiryModelSerializers

    @action(detail=True, methods=['GET'])
    def listing(self, request, pk=None):
        if pk == "0":
            serializer = ContactEnquiryModelSerializers(ContactEnquiryModel.objects.filter(hideStatus=0).order_by('-id'), many=True)
        else:
            serializer = ContactEnquiryModelSerializers(ContactEnquiryModel.objects.filter(hideStatus=0, id=pk).order_by('-id'),
                                              many=True)
        response = {'code': 1, 'data': serializer.data, 'message': "All Retrieved"}
        return Response(response)

    @action(detail=True, methods=['POST'])
    def processing(self, request, pk=None):
        if pk == "0":
            serializer = ContactEnquiryModelSerializers(data=request.data)
        else:
            serializer = ContactEnquiryModelSerializers(instance=ContactEnquiryModel.objects.get(id=pk), data=request.data)
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


def index_view(request):
    courses = CourseModel.objects.filter(hideStatus=0).order_by('-createdAt')
    blogs = BlogModel.objects.filter(hideStatus=0).order_by('-blogDate')[:7]

    context = {
        'courses': courses,
        'blogs': blogs
    }
    return render(request, 'index.html', context)


def membership_view(request):
    plan = PlanModel.objects.filter(hideStatus=0).order_by('-createdAt')

    context = {
        'plan': plan,
    }
    return render(request, 'membership.html', context)


def news_view(request):
    courses = CourseModel.objects.filter(hideStatus=0).order_by('-createdAt')
    blogs = BlogModel.objects.filter(hideStatus=0).order_by('-blogDate')[:7]

    context = {
        'courses': courses,
        'blogs': blogs
    }
    return render(request, 'news.html', context)
