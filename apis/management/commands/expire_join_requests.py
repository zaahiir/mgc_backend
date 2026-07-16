from django.core.management.base import BaseCommand

from apis.models import JoinRequestModel


class Command(BaseCommand):
    help = (
        "Auto-expire pending join requests whose course-defined cut-off "
        "(joinRequestExpiryHours before tee time) has passed, and notify the "
        "requesters. Schedule this (e.g. every 5-10 minutes) via cron or "
        "Windows Task Scheduler for timely expiry."
    )

    def handle(self, *args, **options):
        count = JoinRequestModel.expire_stale_requests()
        self.stdout.write(
            self.style.SUCCESS(f"Expired {count} stale join request(s).")
        )
