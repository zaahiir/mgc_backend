#!/usr/bin/env python
"""
Script to create sample instructor data for member-team functionality
Run this with: python manage.py shell < create_instructor_data.py
"""

from apis.models import InstructorModel

def create_instructor_data():
    print("Creating sample instructor data...")
    
    # Sample instructor data
    instructors_data = [
        {
            'instructorName': 'John Smith',
            'instructorPosition': 'Head Golf Instructor',
            'facebookUrl': 'https://facebook.com/johnsmith',
            'instagramUrl': 'https://instagram.com/johnsmith',
            'twitterUrl': 'https://twitter.com/johnsmith'
        },
        {
            'instructorName': 'Sarah Johnson',
            'instructorPosition': 'Senior Golf Coach',
            'facebookUrl': 'https://facebook.com/sarahjohnson',
            'instagramUrl': 'https://instagram.com/sarahjohnson',
            'twitterUrl': 'https://twitter.com/sarahjohnson'
        },
        {
            'instructorName': 'Michael Chen',
            'instructorPosition': 'Junior Golf Specialist',
            'facebookUrl': 'https://facebook.com/michaelchen',
            'instagramUrl': 'https://instagram.com/michaelchen',
            'twitterUrl': 'https://twitter.com/michaelchen'
        },
        {
            'instructorName': 'Emily Davis',
            'instructorPosition': 'Golf Fitness Trainer',
            'facebookUrl': 'https://facebook.com/emilydavis',
            'instagramUrl': 'https://instagram.com/emilydavis',
            'twitterUrl': 'https://twitter.com/emilydavis'
        }
    ]
    
    for instructor_data in instructors_data:
        instructor, created = InstructorModel.objects.get_or_create(
            instructorName=instructor_data['instructorName'],
            defaults=instructor_data
        )
        if created:
            print(f"Created instructor: {instructor.instructorName} - {instructor.instructorPosition}")
        else:
            print(f"Instructor already exists: {instructor.instructorName}")
    
    print("\nSample instructor data created successfully!")
    print("You can now test the member-team functionality.")

if __name__ == "__main__":
    create_instructor_data() 