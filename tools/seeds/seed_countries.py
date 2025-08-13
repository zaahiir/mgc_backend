import os
import sys
import django


def seed_countries():
    from apis.models import CountryModel

    default_countries = [
        {"countryName": "India", "countryCode": "IN", "dailCode": "+91"},
        {"countryName": "United Arab Emirates", "countryCode": "AE", "dailCode": "+971"},
        {"countryName": "United Kingdom", "countryCode": "GB", "dailCode": "+44"},
        {"countryName": "United States", "countryCode": "US", "dailCode": "+1"},
    ]

    created_count = 0
    for c in default_countries:
        _, created = CountryModel.objects.get_or_create(
            countryName=c["countryName"],
            defaults={
                "countryCode": c["countryCode"],
                "dailCode": c["dailCode"],
                "hideStatus": 0,
            },
        )
        if created:
            created_count += 1

    return created_count


if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mgc.settings")
    django.setup()
    created = seed_countries()
    print(f"CountryModel: created {created} new records")


