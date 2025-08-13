import os
import sys
import django


def seed_user_types():
    from apis.models import UserTypeModel

    default_user_types = [
        {"userTypeName": "Admin"},
        {"userTypeName": "Member"},
        {"userTypeName": "Staff"},
    ]

    created_count = 0
    for item in default_user_types:
        _, created = UserTypeModel.objects.get_or_create(
            userTypeName=item["userTypeName"],
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
    created = seed_user_types()
    print(f"UserTypeModel: created {created} new records")


