#!/usr/bin/env python
"""
Django management script to create sample members for testing.
Run this script to create 10 sample members with credentials displayed in terminal.
"""

import os
import sys
import django
from datetime import date, timedelta
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import MemberModel, PlanModel, GenderModel, CountryModel, PaymentStatusModel, PaymentMethodModel
from apis.views import PasswordManager

def create_sample_members():
    """Create 10 sample members for testing purposes"""
    
    print("=== CREATING SAMPLE MEMBERS ===")
    
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
        print("ERROR: No plan available. Please create a plan first.")
        return
    
    created_members = []
    password_manager = PasswordManager()
    
    for i, name_data in enumerate(sample_names, 1):
        # Generate unique email if needed
        base_email = name_data['email']
        if MemberModel.objects.filter(email=base_email).exists():
            base_email = "member{}.{}".format(i, name_data['email'])
        
        # Generate member data
        member_data = {
            'firstName': name_data['firstName'],
            'lastName': name_data['lastName'],
            'email': base_email,
            'phoneNumber': f"+1-555-{1000 + i:04d}",
            'plan': plan,
            'gender': gender,
            'nationality': nationality,
            'paymentStatus': payment_status,
            'paymentMethod': payment_method,
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
        
        # Generate password
        password = f"password{i}"
        
        # Encrypt password
        encrypted_pwd, hashed_pwd = password_manager.encrypt_password(password)
        member_data['encrypted_password'] = encrypted_pwd
        member_data['hashed_password'] = hashed_pwd
        
        # Create member
        try:
            member = MemberModel.objects.create(**member_data)
            
            # Log credentials
            print(f"\n=== SAMPLE MEMBER {i} CREATED ===")
            print(f"Email: {member.email}")
            print(f"Password: {password}")
            print(f"Member ID: {member.golfClubId or 'Not Generated'}")
            print(f"Full Name: {member.firstName} {member.lastName}")
            print(f"Phone: {member.phoneNumber}")
            print(f"QR Token: {member.qr_token}")
            print("================================")
            
            created_members.append({
                'id': member.id,
                'golfClubId': member.golfClubId or 'Not Generated',
                'email': member.email,
                'password': password,
                'fullName': f"{member.firstName} {member.lastName}",
                'phone': member.phoneNumber,
                'qr_token': member.qr_token
            })
        except Exception as e:
            print(f"ERROR: Failed to create sample member {i}: {str(e)}")
    
    print(f"\n=== SAMPLE MEMBERS SUMMARY ===")
    print(f"Total created: {len(created_members)}")
    print("===============================")
    
    # Print all credentials in a table format
    if created_members:
        print("\n=== ALL MEMBER CREDENTIALS ===")
        print(f"{'No.':<3} {'Member ID':<15} {'Email':<30} {'Password':<12} {'Name':<20}")
        print("-" * 85)
        for i, member in enumerate(created_members, 1):
            member_id = member['golfClubId'] or 'Not Generated'
            print(f"{i:<3} {member_id:<15} {member['email']:<30} {member['password']:<12} {member['fullName']:<20}")
        print("=" * 85)

if __name__ == "__main__":
    create_sample_members() 