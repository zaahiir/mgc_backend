# Generated manually to populate slot_date field for existing booking slots

from django.db import migrations


def populate_slot_date(apps, schema_editor):
    """Populate slot_date field for existing booking slots"""
    BookingSlotModel = apps.get_model('apis', 'BookingSlotModel')
    
    # Update all existing slots to use their booking's date
    for slot in BookingSlotModel.objects.all():
        if slot.booking and slot.booking.bookingDate:
            slot.slot_date = slot.booking.bookingDate
            slot.save()


def reverse_populate_slot_date(apps, schema_editor):
    """Reverse operation - clear slot_date field"""
    BookingSlotModel = apps.get_model('apis', 'BookingSlotModel')
    BookingSlotModel.objects.all().update(slot_date=None)


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0037_add_slot_date_to_booking_slot'),
    ]

    operations = [
        migrations.RunPython(populate_slot_date, reverse_populate_slot_date),
    ]
