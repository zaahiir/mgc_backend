#!/usr/bin/env python3
"""
Script to create 10 sample members for the Golf Club Management System.
This script creates members with usernames user1 to user10 and passwords password1 to password10.
"""

import os
import sys
import django
from datetime import date, datetime
import hashlib
import uuid

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import MemberModel, GenderModel, CountryModel, PlanModel, PaymentStatusModel, PaymentMethodModel

def create_sample_members():
    """Create 10 sample members with predefined credentials"""
    
    print("=== CREATING SAMPLE MEMBERS ===")
    print("This will create 10 sample members with the following credentials:")
    print()
    
    # Sample data for creating members
    sample_members_data = []
    
    for i in range(1, 11):
        member_data = {
            'firstName': f'Sample{i}',
            'lastName': f'User{i}',
            'email': f'user{i}@example.com',
            'password': f'password{i}',
            'phoneNumber': f'+1234567890{i:02d}',
            'alternatePhoneNumber': f'+1234567891{i:02d}',
            'dateOfBirth': date(1990, 1, 1),
            'address': f'Sample Address {i}, Test City, Test State 1234{i:02d}',
            'emergencyContactName': f'Emergency Contact {i}',
            'emergencyContactPhone': f'+1234567892{i:02d}',
            'emergencyContactRelation': 'Spouse',
            'referredBy': f'Referral {i}',
            'handicap': False,
            'golfClubId': f'MGC{i:03d}',
            'username': f'user{i}',
            'password_plain': f'password{i}'
        }
        sample_members_data.append(member_data)
    
    # Display credentials
    print("=== SAMPLE MEMBERS CREDENTIALS ===")
    for i, member_data in enumerate(sample_members_data, 1):
        print(f"User {i}:")
        print(f"  Username: {member_data['username']}")
        print(f"  Password: {member_data['password_plain']}")
        print(f"  Email: {member_data['email']}")
        print(f"  Golf Club ID: {member_data['golfClubId']}")
        print("---")
    print("=== END CREDENTIALS ===")
    print()
    
    # Get or create required foreign key objects
    try:
        # Get or create Gender
        gender, created = GenderModel.objects.get_or_create(
            genderName='Male',
            defaults={'hideStatus': 0}
        )
        if created:
            print(f"Created gender: {gender.genderName}")
        
        # Get or create Country
        country, created = CountryModel.objects.get_or_create(
            countryName='United States',
            defaults={
                'countryCode': 'US',
                'dailCode': '+1',
                'hideStatus': 0
            }
        )
        if created:
            print(f"Created country: {country.countryName}")
        
        # Get or create Plan
        plan, created = PlanModel.objects.get_or_create(
            planName='Basic Plan',
            defaults={
                'planDescription': 'Basic membership plan',
                'planPrice': 99.99,
                'hideStatus': 0
            }
        )
        if created:
            print(f"Created plan: {plan.planName}")
        
        # Get or create Payment Status
        payment_status, created = PaymentStatusModel.objects.get_or_create(
            statusName='Paid',
            defaults={'hideStatus': 0}
        )
        if created:
            print(f"Created payment status: {payment_status.statusName}")
        
        # Get or create Payment Method
        payment_method, created = PaymentMethodModel.objects.get_or_create(
            methodName='Credit Card',
            defaults={'hideStatus': 0}
        )
        if created:
            print(f"Created payment method: {payment_method.methodName}")
        
        # Create members
        created_members = []
        for member_data in sample_members_data:
            # Check if member already exists
            existing_member = MemberModel.objects.filter(email=member_data['email']).first()
            if existing_member:
                print(f"Member with email {member_data['email']} already exists, skipping...")
                continue
            
            # Hash the password
            password_hash = hashlib.sha256(member_data['password_plain'].encode()).hexdigest()
            
            # Create member
            member = MemberModel(
                firstName=member_data['firstName'],
                lastName=member_data['lastName'],
                email=member_data['email'],
                password=member_data['password_plain'],  # Store plain password for reference
                encrypted_password=password_hash,
                hashed_password=password_hash,
                phoneNumber=member_data['phoneNumber'],
                alternatePhoneNumber=member_data['alternatePhoneNumber'],
                dateOfBirth=member_data['dateOfBirth'],
                gender=gender,
                nationality=country,
                address=member_data['address'],
                plan=plan,
                membershipStartDate=date.today(),
                emergencyContactName=member_data['emergencyContactName'],
                emergencyContactPhone=member_data['emergencyContactPhone'],
                emergencyContactRelation=member_data['emergencyContactRelation'],
                paymentStatus=payment_status,
                paymentMethod=payment_method,
                referredBy=member_data['referredBy'],
                handicap=member_data['handicap'],
                golfClubId=member_data['golfClubId'],
                qr_token=str(uuid.uuid4()),
                hideStatus=0
            )
            
            member.save()
            created_members.append(member)
            print(f"Created member: {member.firstName} {member.lastName} ({member.golfClubId})")
        
        print()
        print(f"=== SUMMARY ===")
        print(f"Successfully created {len(created_members)} sample members")
        print(f"Total members in database: {MemberModel.objects.count()}")
        print()
        print("=== LOGIN CREDENTIALS ===")
        print("You can use these credentials to login:")
        for i, member_data in enumerate(sample_members_data, 1):
            print(f"User {i}: {member_data['username']} / {member_data['password_plain']}")
        print("=== END ===")
        
    except Exception as e:
        print(f"Error creating sample members: {e}")
        return False
    
    return True

def main():
    """Main function to run the script"""
    print("Golf Club Management System - Sample Members Creator")
    print("=" * 50)
    
    # Ask for confirmation
    response = input("Do you want to create 10 sample members? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Operation cancelled.")
        return
    
    # Create sample members
    success = create_sample_members()
    
    if success:
        print("\n✅ Sample members created successfully!")
    else:
        print("\n❌ Failed to create sample members.")

if __name__ == "__main__":
    main() 