from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import User

class Command(BaseCommand):
    help = 'Delete a user from the User model by email address'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='The email address of the user to delete'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the deletion without prompting'
        )

    def handle(self, *args, **options):
        email = options['email']
        confirm = options['confirm']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with email "{email}" does not exist in User model.')
            )
            return
        
        # Show user info
        self.stdout.write(f'Found user in User model:')
        self.stdout.write(f'  Email: {user.email}')
        self.stdout.write(f'  Name: {user.name}')
        self.stdout.write(f'  Role: {user.role}')
        self.stdout.write(f'  Date joined: {user.date_joined}')
        self.stdout.write(f'  Is active: {user.is_active}')
        self.stdout.write(f'  Is staff: {user.is_staff}')
        
        # Confirm deletion
        if not confirm:
            response = input(f'\nAre you sure you want to delete user "{email}" from the User model? (yes/no): ')
            if response.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Deletion cancelled.'))
                return
        
        # Delete the user
        try:
            with transaction.atomic():
                user_email = user.email
                user.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deleted user "{user_email}" from the User model.')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error deleting user: {str(e)}')
            ) 