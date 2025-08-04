# Generated manually to remove pricePerPerson field

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0024_amenitiesmodel_amenitiesdescription'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='teemodel',
            name='pricePerPerson',
        ),
    ] 