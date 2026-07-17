from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from apis.models import BookingModel


class Command(BaseCommand):
    help = (
        "Report members holding more than one booking at the same date + time. "
        "The booking rules block new clashes, so anything listed here predates "
        "them. Reports only by default; pass --resolve to keep the earliest "
        "booking of each clash and hide the rest (hideStatus=1, nothing deleted)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--resolve',
            action='store_true',
            help="Hide all but the earliest-created booking in each clash.",
        )

    def handle(self, *args, **options):
        groups = defaultdict(list)
        rows = BookingModel.objects.filter(
            is_join_request=False,
            hideStatus=0,
            status__in=BookingModel.ACTIVE_STATUSES,
            slot_date__isnull=False,
            booking_time__isnull=False,
        ).select_related('member', 'course').order_by('createdAt')

        for booking in rows:
            groups[(booking.member_id, booking.slot_date, booking.booking_time)].append(booking)

        clashes = {key: items for key, items in groups.items() if len(items) > 1}

        if not clashes:
            self.stdout.write(self.style.SUCCESS("No conflicting bookings found."))
            return

        self.stdout.write(
            self.style.WARNING(f"Found {len(clashes)} conflicting slot(s):")
        )
        for (member_id, slot_date, booking_time), items in sorted(clashes.items()):
            member = items[0].member
            self.stdout.write(
                f"\n  {member.firstName} {member.lastName} (member {member_id}) "
                f"on {slot_date} at {booking_time.strftime('%H:%M')}:"
            )
            for i, booking in enumerate(items):
                course = booking.course.courseName if booking.course else 'unknown course'
                marker = 'keep  ' if i == 0 else 'hide  '
                self.stdout.write(
                    f"    [{marker if options['resolve'] else '      '}] "
                    f"{booking.booking_id} - {course} "
                    f"({booking.status}, {booking.participants}p, created {booking.createdAt:%Y-%m-%d %H:%M})"
                )

        if not options['resolve']:
            self.stdout.write(
                "\nReport only. Re-run with --resolve to keep the earliest of each "
                "and hide the rest."
            )
            return

        hidden = 0
        with transaction.atomic():
            for items in clashes.values():
                for booking in items[1:]:
                    booking.hideStatus = 1
                    booking.save(update_fields=['hideStatus', 'updatedAt'])
                    hidden += 1

        self.stdout.write(
            self.style.SUCCESS(f"\nHid {hidden} conflicting booking(s). Nothing was deleted.")
        )
