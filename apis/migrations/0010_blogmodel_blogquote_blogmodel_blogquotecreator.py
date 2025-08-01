# Generated by Django 5.0.7 on 2025-08-01 14:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apis', '0009_aboutmodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='blogmodel',
            name='blogQuote',
            field=models.TextField(blank=True, help_text='Quote text for the blog', null=True),
        ),
        migrations.AddField(
            model_name='blogmodel',
            name='blogQuoteCreator',
            field=models.CharField(blank=True, help_text='Name of the quote creator', max_length=255, null=True),
        ),
    ]
