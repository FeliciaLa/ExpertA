# Generated manually to populate slug values

from django.db import migrations
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    User = apps.get_model('api', 'User')
    
    for user in User.objects.filter(slug__isnull=True):
        if user.name:
            base_slug = slugify(user.name)
            if base_slug:
                slug = base_slug
                counter = 1
                while User.objects.filter(slug=slug).exclude(id=user.id).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                user.slug = slug
                user.save()


def reverse_populate_slugs(apps, schema_editor):
    # We can't really reverse this operation meaningfully
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_add_user_slug'),
    ]

    operations = [
        migrations.RunPython(populate_slugs, reverse_populate_slugs),
    ] 