# Generated manually to enhance booking models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0035_remove_bookingmodel_totalprice_and_more'),
    ]

    operations = [
        # Remove the single tee field from BookingModel
        migrations.RemoveField(
            model_name='bookingmodel',
            name='tee',
        ),
        
        # Remove the single booking time field from BookingModel
        migrations.RemoveField(
            model_name='bookingmodel',
            name='bookingTime',
        ),
        
        # Add new fields to BookingSlotModel for better tee information
        migrations.AddField(
            model_name='bookingslotmodel',
            name='teeName',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        
        migrations.AddField(
            model_name='bookingslotmodel',
            name='courseName',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
