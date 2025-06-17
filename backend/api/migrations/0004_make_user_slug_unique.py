# Generated manually to make slug field unique

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_populate_user_slugs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='slug',
            field=models.SlugField(blank=True, max_length=100, unique=True),
        ),
    ] 