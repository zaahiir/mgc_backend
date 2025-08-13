import os
import sys
import django


def seed_payment_statuses():
    from apis.models import PaymentStatusModel

    default_statuses = ["Pending", "Completed", "Failed", "Refunded"]

    created_count = 0
    for status in default_statuses:
        _, created = PaymentStatusModel.objects.get_or_create(
            statusName=status,
            defaults={"hideStatus": 0},
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
    created = seed_payment_statuses()
    print(f"PaymentStatusModel: created {created} new records")


