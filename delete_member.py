#!/usr/bin/env python3
import os
import django

# Set environment variable
os.environ['DJANGO_ENVIRONMENT'] = 'production'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import MemberModel

def delete_member():
    try:
        print("Looking for member with email: martinjeromeilango@gmail.com")
        
        member = MemberModel.objects.filter(email='martinjeromeilango@gmail.com').first()
        
        if member:
            print(f"Found member: {member.firstName} {member.lastName} (ID: {member.id})")
            member.delete()
            print("✅ Member deleted successfully!")
        else:
            print("❌ Member not found with email: martinjeromeilango@gmail.com")
            
    except Exception as e:
        print(f"❌ Error deleting member: {str(e)}")

if __name__ == "__main__":
    delete_member()
