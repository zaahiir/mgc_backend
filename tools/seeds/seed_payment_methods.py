import os
import sys
import django


def seed_payment_methods():
    from apis.models import PaymentMethodModel

    default_methods = ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "UPI"]

    created_count = 0
    for method in default_methods:
        _, created = PaymentMethodModel.objects.get_or_create(
            methodName=method,
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
    created = seed_payment_methods()
    print(f"PaymentMethodModel: created {created} new records")


