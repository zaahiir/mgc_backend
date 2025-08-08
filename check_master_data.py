#!/usr/bin/env python3
import os
import django

# Set environment variable
os.environ['DJANGO_ENVIRONMENT'] = 'production'

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import GenderModel, CountryModel, PlanModel

def check_master_data():
    print("Checking master data...")
    
    gender_count = GenderModel.objects.count()
    country_count = CountryModel.objects.count()
    plan_count = PlanModel.objects.count()
    
    print(f"Gender records: {gender_count}")
    print(f"Country records: {country_count}")
    print(f"Plan records: {plan_count}")
    
    if gender_count == 0:
        print("⚠️  No gender records found. Creating sample gender...")
        GenderModel.objects.create(genderName='Male')
        GenderModel.objects.create(genderName='Female')
        GenderModel.objects.create(genderName='Other')
        print("✅ Sample gender records created")
    
    if country_count == 0:
        print("⚠️  No country records found. Creating sample countries...")
        CountryModel.objects.create(countryName='United States', countryCode='US', dailCode='+1')
        CountryModel.objects.create(countryName='United Kingdom', countryCode='UK', dailCode='+44')
        CountryModel.objects.create(countryName='Canada', countryCode='CA', dailCode='+1')
        print("✅ Sample country records created")
    
    if plan_count == 0:
        print("⚠️  No plan records found. Creating sample plans...")
        PlanModel.objects.create(
            planName='Basic Plan',
            planDescription='Basic membership plan',
            planDuration=1,
            planPrice=99.99
        )
        PlanModel.objects.create(
            planName='Premium Plan',
            planDescription='Premium membership plan',
            planDuration=1,
            planPrice=199.99
        )
        print("✅ Sample plan records created")

if __name__ == "__main__":
    check_master_data()
