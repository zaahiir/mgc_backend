#!/usr/bin/env python3
import os
import django

# Set environment variable
os.environ['DJANGO_ENVIRONMENT'] = 'production'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import MemberModel, GenderModel, CountryModel, PlanModel
from apis.views import MemberViewSet
import uuid

def create_test_member():
    try:
        print("Creating test member with email: martinjeromeilango@gmail.com")
        
        # Get or create required data
        gender = GenderModel.objects.first()
        country = CountryModel.objects.first()
        plan = PlanModel.objects.first()
        
        # Generate a unique password
        password = str(uuid.uuid4())[:8]  # 8 character password
        
        # Create test member
        member = MemberModel.objects.create(
            firstName='Martin',
            lastName='Jerome',
            email='martinjeromeilango@gmail.com',
            phoneNumber='+1234567890',
            plan=plan.id if plan else 1,
            gender=gender,
            nationality=country,
            address='123 Test Street, Test City',
            membershipStartDate='2024-01-01',
            emergencyContactName='Test Contact',
            emergencyContactPhone='+1234567891',
            emergencyContactRelation='Friend',
            password=password  # Store the password
        )
        
        print(f"✅ Test member created successfully!")
        print(f"   Name: {member.firstName} {member.lastName}")
        print(f"   Email: {member.email}")
        print(f"   ID: {member.id}")
        print(f"   Golf Club ID: {member.golfClubId}")
        print(f"   Password: {password}")
        print(f"   QR Token: {member.qr_token}")
        
        # Test email functionality
        print("\n📧 Testing email functionality...")
        try:
            # Create a MemberViewSet instance to use its email method
            viewset = MemberViewSet()
            
            # Test sending credentials with QR email
            email_sent = viewset.send_credentials_with_qr_email(
                email=member.email,
                member_id=member.golfClubId or f"MGC{member.id:04d}",
                password=password,
                qr_token=member.qr_token
            )
            
            if email_sent:
                print("✅ Email sent successfully!")
                print("📬 Check your email: martinjeromeilango@gmail.com")
                print("   - Username: martinjeromeilango@gmail.com")
                print(f"   - Password: {password}")
                print(f"   - QR Code should be attached")
            else:
                print("❌ Email sending failed")
                print("   This might be due to email configuration issues")
            
        except Exception as email_error:
            print(f"❌ Email sending failed: {str(email_error)}")
            print("   This might be due to email configuration issues")
        
        return member
        
    except Exception as e:
        print(f"❌ Error creating test member: {str(e)}")
        return None

if __name__ == "__main__":
    create_test_member()
