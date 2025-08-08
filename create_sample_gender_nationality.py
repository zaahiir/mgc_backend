#!/usr/bin/env python3
"""
Script to create sample records for Gender and Nationality (Country) models.
This script creates common gender options and popular countries with their codes.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import GenderModel, CountryModel

def create_sample_genders():
    """Create sample gender records"""
    print("=== CREATING SAMPLE GENDERS ===")
    
    # Sample gender data
    genders = [
        {'genderName': 'Male'},
        {'genderName': 'Female'},
        {'genderName': 'Other'},
        {'genderName': 'Prefer not to say'}
    ]
    
    created_genders = []
    for gender_data in genders:
        gender, created = GenderModel.objects.get_or_create(
            genderName=gender_data['genderName'],
            defaults={'hideStatus': 0}
        )
        if created:
            created_genders.append(gender)
            print(f"✅ Created gender: {gender.genderName}")
        else:
            print(f"⏭️  Gender '{gender.genderName}' already exists, skipping...")
    
    print(f"Total genders created: {len(created_genders)}")
    print(f"Total genders in database: {GenderModel.objects.count()}")
    print()
    return created_genders

def create_sample_countries():
    """Create sample country records"""
    print("=== CREATING SAMPLE COUNTRIES ===")
    
    # Sample country data with country codes and dial codes
    countries = [
        {'countryName': 'United States', 'countryCode': 'US', 'dailCode': '+1'},
        {'countryName': 'United Kingdom', 'countryCode': 'GB', 'dailCode': '+44'},
        {'countryName': 'Canada', 'countryCode': 'CA', 'dailCode': '+1'},
        {'countryName': 'Australia', 'countryCode': 'AU', 'dailCode': '+61'},
        {'countryName': 'Germany', 'countryCode': 'DE', 'dailCode': '+49'},
        {'countryName': 'France', 'countryCode': 'FR', 'dailCode': '+33'},
        {'countryName': 'Italy', 'countryCode': 'IT', 'dailCode': '+39'},
        {'countryName': 'Spain', 'countryCode': 'ES', 'dailCode': '+34'},
        {'countryName': 'Netherlands', 'countryCode': 'NL', 'dailCode': '+31'},
        {'countryName': 'Belgium', 'countryCode': 'BE', 'dailCode': '+32'},
        {'countryName': 'Switzerland', 'countryCode': 'CH', 'dailCode': '+41'},
        {'countryName': 'Austria', 'countryCode': 'AT', 'dailCode': '+43'},
        {'countryName': 'Sweden', 'countryCode': 'SE', 'dailCode': '+46'},
        {'countryName': 'Norway', 'countryCode': 'NO', 'dailCode': '+47'},
        {'countryName': 'Denmark', 'countryCode': 'DK', 'dailCode': '+45'},
        {'countryName': 'Finland', 'countryCode': 'FI', 'dailCode': '+358'},
        {'countryName': 'Poland', 'countryCode': 'PL', 'dailCode': '+48'},
        {'countryName': 'Czech Republic', 'countryCode': 'CZ', 'dailCode': '+420'},
        {'countryName': 'Hungary', 'countryCode': 'HU', 'dailCode': '+36'},
        {'countryName': 'Slovakia', 'countryCode': 'SK', 'dailCode': '+421'},
        {'countryName': 'Slovenia', 'countryCode': 'SI', 'dailCode': '+386'},
        {'countryName': 'Croatia', 'countryCode': 'HR', 'dailCode': '+385'},
        {'countryName': 'Serbia', 'countryCode': 'RS', 'dailCode': '+381'},
        {'countryName': 'Bulgaria', 'countryCode': 'BG', 'dailCode': '+359'},
        {'countryName': 'Romania', 'countryCode': 'RO', 'dailCode': '+40'},
        {'countryName': 'Greece', 'countryCode': 'GR', 'dailCode': '+30'},
        {'countryName': 'Portugal', 'countryCode': 'PT', 'dailCode': '+351'},
        {'countryName': 'Ireland', 'countryCode': 'IE', 'dailCode': '+353'},
        {'countryName': 'Iceland', 'countryCode': 'IS', 'dailCode': '+354'},
        {'countryName': 'Luxembourg', 'countryCode': 'LU', 'dailCode': '+352'},
        {'countryName': 'Malta', 'countryCode': 'MT', 'dailCode': '+356'},
        {'countryName': 'Cyprus', 'countryCode': 'CY', 'dailCode': '+357'},
        {'countryName': 'Estonia', 'countryCode': 'EE', 'dailCode': '+372'},
        {'countryName': 'Latvia', 'countryCode': 'LV', 'dailCode': '+371'},
        {'countryName': 'Lithuania', 'countryCode': 'LT', 'dailCode': '+370'},
        {'countryName': 'Japan', 'countryCode': 'JP', 'dailCode': '+81'},
        {'countryName': 'South Korea', 'countryCode': 'KR', 'dailCode': '+82'},
        {'countryName': 'China', 'countryCode': 'CN', 'dailCode': '+86'},
        {'countryName': 'India', 'countryCode': 'IN', 'dailCode': '+91'},
        {'countryName': 'Singapore', 'countryCode': 'SG', 'dailCode': '+65'},
        {'countryName': 'Malaysia', 'countryCode': 'MY', 'dailCode': '+60'},
        {'countryName': 'Thailand', 'countryCode': 'TH', 'dailCode': '+66'},
        {'countryName': 'Vietnam', 'countryCode': 'VN', 'dailCode': '+84'},
        {'countryName': 'Philippines', 'countryCode': 'PH', 'dailCode': '+63'},
        {'countryName': 'Indonesia', 'countryCode': 'ID', 'dailCode': '+62'},
        {'countryName': 'Brazil', 'countryCode': 'BR', 'dailCode': '+55'},
        {'countryName': 'Argentina', 'countryCode': 'AR', 'dailCode': '+54'},
        {'countryName': 'Chile', 'countryCode': 'CL', 'dailCode': '+56'},
        {'countryName': 'Colombia', 'countryCode': 'CO', 'dailCode': '+57'},
        {'countryName': 'Peru', 'countryCode': 'PE', 'dailCode': '+51'},
        {'countryName': 'Mexico', 'countryCode': 'MX', 'dailCode': '+52'},
        {'countryName': 'South Africa', 'countryCode': 'ZA', 'dailCode': '+27'},
        {'countryName': 'Egypt', 'countryCode': 'EG', 'dailCode': '+20'},
        {'countryName': 'Morocco', 'countryCode': 'MA', 'dailCode': '+212'},
        {'countryName': 'Tunisia', 'countryCode': 'TN', 'dailCode': '+216'},
        {'countryName': 'Algeria', 'countryCode': 'DZ', 'dailCode': '+213'},
        {'countryName': 'Libya', 'countryCode': 'LY', 'dailCode': '+218'},
        {'countryName': 'Sudan', 'countryCode': 'SD', 'dailCode': '+249'},
        {'countryName': 'Ethiopia', 'countryCode': 'ET', 'dailCode': '+251'},
        {'countryName': 'Kenya', 'countryCode': 'KE', 'dailCode': '+254'},
        {'countryName': 'Nigeria', 'countryCode': 'NG', 'dailCode': '+234'},
        {'countryName': 'Ghana', 'countryCode': 'GH', 'dailCode': '+233'},
        {'countryName': 'Senegal', 'countryCode': 'SN', 'dailCode': '+221'},
        {'countryName': 'Ivory Coast', 'countryCode': 'CI', 'dailCode': '+225'},
        {'countryName': 'Cameroon', 'countryCode': 'CM', 'dailCode': '+237'},
        {'countryName': 'Uganda', 'countryCode': 'UG', 'dailCode': '+256'},
        {'countryName': 'Tanzania', 'countryCode': 'TZ', 'dailCode': '+255'},
        {'countryName': 'Zimbabwe', 'countryCode': 'ZW', 'dailCode': '+263'},
        {'countryName': 'Zambia', 'countryCode': 'ZM', 'dailCode': '+260'},
        {'countryName': 'Botswana', 'countryCode': 'BW', 'dailCode': '+267'},
        {'countryName': 'Namibia', 'countryCode': 'NA', 'dailCode': '+264'},
        {'countryName': 'Mozambique', 'countryCode': 'MZ', 'dailCode': '+258'},
        {'countryName': 'Angola', 'countryCode': 'AO', 'dailCode': '+244'},
        {'countryName': 'Madagascar', 'countryCode': 'MG', 'dailCode': '+261'},
        {'countryName': 'Mauritius', 'countryCode': 'MU', 'dailCode': '+230'},
        {'countryName': 'Seychelles', 'countryCode': 'SC', 'dailCode': '+248'},
        {'countryName': 'Comoros', 'countryCode': 'KM', 'dailCode': '+269'},
        {'countryName': 'Djibouti', 'countryCode': 'DJ', 'dailCode': '+253'},
        {'countryName': 'Somalia', 'countryCode': 'SO', 'dailCode': '+252'},
        {'countryName': 'Eritrea', 'countryCode': 'ER', 'dailCode': '+291'},
        {'countryName': 'Burundi', 'countryCode': 'BI', 'dailCode': '+257'},
        {'countryName': 'Rwanda', 'countryCode': 'RW', 'dailCode': '+250'},
        {'countryName': 'Central African Republic', 'countryCode': 'CF', 'dailCode': '+236'},
        {'countryName': 'Chad', 'countryCode': 'TD', 'dailCode': '+235'},
        {'countryName': 'Niger', 'countryCode': 'NE', 'dailCode': '+227'},
        {'countryName': 'Mali', 'countryCode': 'ML', 'dailCode': '+223'},
        {'countryName': 'Burkina Faso', 'countryCode': 'BF', 'dailCode': '+226'},
        {'countryName': 'Togo', 'countryCode': 'TG', 'dailCode': '+228'},
        {'countryName': 'Benin', 'countryCode': 'BJ', 'dailCode': '+229'},
        {'countryName': 'Guinea', 'countryCode': 'GN', 'dailCode': '+224'},
        {'countryName': 'Guinea-Bissau', 'countryCode': 'GW', 'dailCode': '+245'},
        {'countryName': 'Sierra Leone', 'countryCode': 'SL', 'dailCode': '+232'},
        {'countryName': 'Liberia', 'countryCode': 'LR', 'dailCode': '+231'},
        {'countryName': 'Gambia', 'countryCode': 'GM', 'dailCode': '+220'},
        {'countryName': 'Cape Verde', 'countryCode': 'CV', 'dailCode': '+238'},
        {'countryName': 'São Tomé and Príncipe', 'countryCode': 'ST', 'dailCode': '+239'},
        {'countryName': 'Equatorial Guinea', 'countryCode': 'GQ', 'dailCode': '+240'},
        {'countryName': 'Gabon', 'countryCode': 'GA', 'dailCode': '+241'},
        {'countryName': 'Republic of the Congo', 'countryCode': 'CG', 'dailCode': '+242'},
        {'countryName': 'Democratic Republic of the Congo', 'countryCode': 'CD', 'dailCode': '+243'},
        {'countryName': 'South Sudan', 'countryCode': 'SS', 'dailCode': '+211'},
        {'countryName': 'Eswatini', 'countryCode': 'SZ', 'dailCode': '+268'},
        {'countryName': 'Lesotho', 'countryCode': 'LS', 'dailCode': '+266'},
        {'countryName': 'Malawi', 'countryCode': 'MW', 'dailCode': '+265'},
    ]
    
    created_countries = []
    for country_data in countries:
        country, created = CountryModel.objects.get_or_create(
            countryName=country_data['countryName'],
            defaults={
                'countryCode': country_data['countryCode'],
                'dailCode': country_data['dailCode'],
                'hideStatus': 0
            }
        )
        if created:
            created_countries.append(country)
            print(f"✅ Created country: {country.countryName} ({country.countryCode})")
        else:
            print(f"⏭️  Country '{country.countryName}' already exists, skipping...")
    
    print(f"Total countries created: {len(created_countries)}")
    print(f"Total countries in database: {CountryModel.objects.count()}")
    print()
    return created_countries

def main():
    """Main function to run the script"""
    print("Golf Club Management System - Sample Gender and Nationality Creator")
    print("=" * 60)
    
    # Ask for confirmation
    response = input("Do you want to create sample gender and nationality records? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Operation cancelled.")
        return
    
    try:
        # Create sample genders
        created_genders = create_sample_genders()
        
        # Create sample countries
        created_countries = create_sample_countries()
        
        print("=== SUMMARY ===")
        print(f"✅ Successfully created {len(created_genders)} gender records")
        print(f"✅ Successfully created {len(created_countries)} country records")
        print(f"📊 Total genders in database: {GenderModel.objects.count()}")
        print(f"📊 Total countries in database: {CountryModel.objects.count()}")
        print()
        print("🎉 Sample data creation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()
