import os
import sys
import django


def seed_genders():
    from apis.models import GenderModel

    default_genders = ["Male", "Female", "Other"]

    created_count = 0
    for name in default_genders:
        _, created = GenderModel.objects.get_or_create(
            genderName=name,
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
    created = seed_genders()
    print(f"GenderModel: created {created} new records")


