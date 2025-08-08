#!/usr/bin/env python3
import os
import django
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Set environment variable
os.environ['DJANGO_ENVIRONMENT'] = 'production'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from django.conf import settings
from apis.models import MemberModel

def test_email_config():
    print("Testing email configuration...")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    
    try:
        # Test SMTP connection
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        print("✅ SMTP connection successful!")
        server.quit()
    except Exception as e:
        print(f"❌ SMTP connection failed: {str(e)}")
        print("   This is likely due to Gmail requiring an App Password")
        print("   Please update the EMAIL_HOST_PASSWORD in settings.py")

def get_member_details():
    print("\n" + "="*50)
    print("MEMBER DETAILS")
    print("="*50)
    
    try:
        member = MemberModel.objects.get(email='martinjeromeilango@gmail.com')
        print(f"✅ Member found!")
        print(f"   Name: {member.firstName} {member.lastName}")
        print(f"   Email: {member.email}")
        print(f"   ID: {member.id}")
        print(f"   Golf Club ID: {member.golfClubId}")
        print(f"   Password: {member.password}")
        print(f"   QR Token: {member.qr_token}")
        print(f"   Created: {member.createdAt}")
        
        print("\n📧 LOGIN CREDENTIALS:")
        print(f"   Username: {member.email}")
        print(f"   Password: {member.password}")
        print(f"   QR Code Token: {member.qr_token}")
        
        return member
        
    except MemberModel.DoesNotExist:
        print("❌ Member not found with email: martinjeromeilango@gmail.com")
        return None

if __name__ == "__main__":
    test_email_config()
    get_member_details()
