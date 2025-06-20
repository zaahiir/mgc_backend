# Generated by Django 5.0.12 on 2025-06-19 06:47

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0003_alter_membermodel_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='contactenquirymodel',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('completed', 'Completed')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='memberenquirymodel',
            name='converted_date',
            field=models.DateTimeField(blank=True, help_text='Date when enquiry was converted to member', null=True),
        ),
        migrations.AddField(
            model_name='memberenquirymodel',
            name='converted_member_id',
            field=models.CharField(blank=True, help_text='Golf Club ID of the converted member', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='memberenquirymodel',
            name='is_converted',
            field=models.BooleanField(default=False, help_text='Whether this enquiry has been converted to a member'),
        ),
        migrations.AlterField(
            model_name='contactenquirymodel',
            name='contactEnquiryEmail',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='email',
            field=models.EmailField(default='default@example.com', max_length=254, unique=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='firstName',
            field=models.CharField(default='Unknown', max_length=150),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='lastName',
            field=models.CharField(default='User', max_length=150),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='phoneNumber',
            field=models.CharField(default='0000000000', max_length=20),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='membermodel',
            name='plan',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='memberPlan', to='apis.planmodel'),
            preserve_default=False,
        ),
    ]
