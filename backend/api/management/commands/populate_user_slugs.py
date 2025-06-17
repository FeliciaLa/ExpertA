from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import User

class Command(BaseCommand):
    help = 'Populate slug fields for existing users'

    def handle(self, *args, **options):
        users_without_slugs = User.objects.filter(slug__isnull=True) | User.objects.filter(slug='')
        
        self.stdout.write(f'Found {users_without_slugs.count()} users without slugs')
        
        for user in users_without_slugs:
            if user.name:
                base_slug = slugify(user.name)
                if base_slug:  # Only proceed if slugify produced something
                    slug = base_slug
                    # Check for existing slugs and append number if needed
                    counter = 1
                    while User.objects.filter(slug=slug).exclude(id=user.id).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1
                    
                    user.slug = slug
                    user.save()
                    self.stdout.write(f'Created slug "{slug}" for user "{user.name}"')
                else:
                    self.stdout.write(f'Could not create slug for user "{user.name}" - no valid characters')
            else:
                self.stdout.write(f'Skipping user {user.id} - no name provided')
        
        self.stdout.write(self.style.SUCCESS('Successfully populated slugs for all users')) 