# Generated manually to add slug field to User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='slug',
            field=models.SlugField(blank=True, max_length=100, unique=True),
        ),
    ] 