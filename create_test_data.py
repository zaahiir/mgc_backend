#!/usr/bin/env python
"""
Script to create test data for tee booking functionality
Run this with: python manage.py shell < create_test_data.py
"""

from apis.models import CourseModel, TeeModel, MemberModel, PlanModel
from decimal import Decimal

def create_test_data():
    print("Creating test data...")
    
    # Create a test plan
    plan, created = PlanModel.objects.get_or_create(
        planName="Test Plan",
        defaults={
            'planPrice': Decimal('100.00')
        }
    )
    print(f"Plan: {plan.planName} (ID: {plan.id})")
    
    # Create a test course
    course, created = CourseModel.objects.get_or_create(
        courseName="Aldenham Golf Club",
        defaults={
            'courseAddress': 'Church Lane, Watford, Hertfordshire WD25 8NN',
            'courseOpenFrom': 'Daily 6:00 AM - 8:00 PM',
            'coursePhoneNumber': '+44 1923 853929',
            'courseDescription': 'A beautiful golf course with excellent facilities'
        }
    )
    print(f"Course: {course.courseName} (ID: {course.id})")
    
    # Create test tees
    tees_data = [
        {'holeNumber': 9, 'pricePerPerson': Decimal('25.00')},
        {'holeNumber': 18, 'pricePerPerson': Decimal('45.00')},
        {'holeNumber': 27, 'pricePerPerson': Decimal('65.00')},
    ]
    
    for tee_data in tees_data:
        tee, created = TeeModel.objects.get_or_create(
            course=course,
            holeNumber=tee_data['holeNumber'],
            defaults={
                'pricePerPerson': tee_data['pricePerPerson']
            }
        )
        print(f"Tee: {tee.holeNumber} holes - £{tee.pricePerPerson} (ID: {tee.id})")
    
    # Create a test member
    member, created = MemberModel.objects.get_or_create(
        email="test@example.com",
        defaults={
            'firstName': 'Test',
            'lastName': 'User',
            'phoneNumber': '1234567890',
            'plan': plan
        }
    )
    print(f"Member: {member.firstName} {member.lastName} (ID: {member.id})")
    
    print("\nTest data created successfully!")
    print(f"Course ID: {course.id}")
    print(f"Member ID: {member.id}")
    print("You can now test the tee booking functionality.")

if __name__ == "__main__":
    create_test_data() 