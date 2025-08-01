#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mgc.settings')
django.setup()

from apis.models import AboutModel

# Check if about data exists
about_count = AboutModel.objects.count()
print(f"AboutModel instances: {about_count}")

# Get or create the singleton instance
about = AboutModel.get_solo()
print(f"About ID: {about.id}")
print(f"About Heading: {about.aboutHeading}")
print(f"About Description: {about.aboutDescription[:100] if about.aboutDescription else 'No description'}")
print(f"Partner Golf Clubs: {about.partnerGolfClubs}")
print(f"Successful Years: {about.successfulYears}")
print(f"Hide Status: {about.hideStatus}")

# If no data exists, create some sample data
if not about.aboutHeading:
    about.aboutHeading = "Immerse yourself in a luxury golf outing"
    about.aboutDescription = "Lorem ipsum dolor sit amet consectetur. Nam quis bibendum lacinia eu id in. Quisque porttitor tortor blandit nunc sed ac id. Mattis in nunc libero viverra. Consectetur leo nibh ac at amet. Lorem ipsum dolor sit amet consectetur adipisicing elit. Officia magnam expedita numquam asperiores deserunt vel! Aperiam, similique nobis. Veniam dolorem vel quas veritatis autem iste quaerat, provident deserunt fuga ullam. Lorem ipsum dolor sit amet consectetur adipisicing elit. Odio maxime blanditiis dolorem non nulla quis quo amet aliquam sint consequuntur, provident nihil sunt dicta iure vel inventore rerum ad id."
    about.partnerGolfClubs = 25
    about.successfulYears = 15
    about.hideStatus = 0
    about.save()
    print("Created sample about data")
else:
    print("About data already exists") 