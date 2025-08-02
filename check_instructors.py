#!/usr/bin/env python
"""
Script to check existing instructor data
Run this with: python manage.py shell < check_instructors.py
"""

from apis.models import InstructorModel

def check_instructors():
    print("Checking existing instructor data...")
    
    instructors = InstructorModel.objects.filter(hideStatus=0)
    
    if instructors.exists():
        print(f"Found {instructors.count()} active instructors:")
        for instructor in instructors:
            print(f"- {instructor.instructorName} ({instructor.instructorPosition})")
    else:
        print("No active instructors found.")
        print("You can create sample data by running: python manage.py shell < create_instructor_data.py")

if __name__ == "__main__":
    check_instructors() 