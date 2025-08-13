import os
import sys
import django


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mgc.settings")
    django.setup()

    from seed_user_types import seed_user_types
    from seed_countries import seed_countries
    from seed_genders import seed_genders
    from seed_payment_statuses import seed_payment_statuses
    from seed_payment_methods import seed_payment_methods
    from seed_plans import seed_plans

    results = {
        "UserTypeModel": seed_user_types(),
        "CountryModel": seed_countries(),
        "GenderModel": seed_genders(),
        "PaymentStatusModel": seed_payment_statuses(),
        "PaymentMethodModel": seed_payment_methods(),
        "PlanModel": seed_plans(),
    }

    for name, count in results.items():
        print(f"{name}: created {count} new records")


if __name__ == "__main__":
    main()


