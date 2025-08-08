#!/usr/bin/env python3
import os
import django

# Set environment variable
os.environ['DJANGO_ENVIRONMENT'] = 'production'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import MemberModel, GenderModel, CountryModel, PlanModel

def create_sample_member():
    try:
        print("Creating sample member...")
        
        # Get or create required data
        gender = GenderModel.objects.first()
        country = CountryModel.objects.first()
        plan = PlanModel.objects.first()
        
        # Create sample member
        member = MemberModel.objects.create(
            firstName='John',
            lastName='Doe',
            email='john.doe@example.com',
            phoneNumber='+1234567890',
            plan=plan.id if plan else 1,
            gender=gender,
            nationality=country,
            address='123 Sample Street, Sample City',
            membershipStartDate='2024-01-01',
            emergencyContactName='Jane Doe',
            emergencyContactPhone='+1234567891',
            emergencyContactRelation='Spouse'
        )
        
        print(f"✅ Sample member created successfully!")
        print(f"   Name: {member.firstName} {member.lastName}")
        print(f"   Email: {member.email}")
        print(f"   ID: {member.id}")
        print(f"   Golf Club ID: {member.golfClubId}")
        
        return member
        
    except Exception as e:
        print(f"❌ Error creating sample member: {str(e)}")
        return None

if __name__ == "__main__":
    create_sample_member()
