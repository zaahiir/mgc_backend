# Generated manually for removing payment fields and adding alternateEmail

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0030_planfeaturemodel'),
    ]

    operations = [
        # Remove payment fields
        migrations.RemoveField(
            model_name='membermodel',
            name='paymentStatus',
        ),
        migrations.RemoveField(
            model_name='membermodel',
            name='paymentMethod',
        ),
        # Add alternateEmail field
        migrations.AddField(
            model_name='membermodel',
            name='alternateEmail',
            field=models.EmailField(blank=True, null=True),
        ),
    ]
