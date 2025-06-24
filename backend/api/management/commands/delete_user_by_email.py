from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from api.models import User


class Command(BaseCommand):
    help = 'Delete a user or expert by email address'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address of the user to delete')
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the deletion (required for safety)',
        )

    def handle(self, *args, **options):
        email = options['email']
        confirm = options['confirm']

        if not confirm:
            self.stdout.write(
                self.style.ERROR(
                    'You must use --confirm to actually delete the user. '
                    'This is a safety measure to prevent accidental deletions.'
                )
            )
            return

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'No user found with email: {email}')
            )
            return

        # Show user info before deletion
        self.stdout.write(f'Found User: {user.email}')
        if hasattr(user, 'name'):
            self.stdout.write(f'Name: {user.name}')
        self.stdout.write(f'Role: {getattr(user, "role", "Unknown")}')
        self.stdout.write(f'Is Expert: {getattr(user, "is_expert", False)}')
        self.stdout.write(f'Date joined: {user.date_joined}')

        # Delete the user
        user.delete()
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted user: {email}')
        ) 