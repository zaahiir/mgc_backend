import os
import sys
import django
from decimal import Decimal


def seed_plans():
    from apis.models import PlanModel

    default_plans = [
        {
            "planName": "Basic",
            "planDescription": "Basic membership plan",
            "planDuration": 1,
            "planPrice": Decimal("99.00"),
        },
        {
            "planName": "Standard",
            "planDescription": "Standard membership plan",
            "planDuration": 2,
            "planPrice": Decimal("169.00"),
        },
        {
            "planName": "Premium",
            "planDescription": "Premium membership plan",
            "planDuration": 3,
            "planPrice": Decimal("249.00"),
        },
    ]

    created_count = 0
    for p in default_plans:
        _, created = PlanModel.objects.get_or_create(
            planName=p["planName"],
            defaults={
                "planDescription": p["planDescription"],
                "planDuration": p["planDuration"],
                "planPrice": p["planPrice"],
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
    created = seed_plans()
    print(f"PlanModel: created {created} new records")


