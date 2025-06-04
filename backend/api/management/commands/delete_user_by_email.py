from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Delete a user by email address'

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
                self.style.ERROR(f'User with email "{email}" does not exist.')
            )
            return
        
        # Show user info
        self.stdout.write(f'Found user:')
        self.stdout.write(f'  Email: {user.email}')
        self.stdout.write(f'  Username: {user.username}')
        self.stdout.write(f'  Date joined: {user.date_joined}')
        self.stdout.write(f'  Is active: {user.is_active}')
        
        # Count related objects
        related_counts = {}
        if hasattr(user, 'training_messages'):
            related_counts['Training Messages'] = user.training_messages.count()
        if hasattr(user, 'documents'):
            related_counts['Documents'] = user.documents.count()
        if hasattr(user, 'training_sessions'):
            related_counts['Training Sessions'] = user.training_sessions.count()
        if hasattr(user, 'onboarding_answers'):
            related_counts['Onboarding Answers'] = user.onboarding_answers.count()
        
        if related_counts:
            self.stdout.write(f'\nRelated objects that will be deleted:')
            for obj_type, count in related_counts.items():
                if count > 0:
                    self.stdout.write(f'  {obj_type}: {count}')
        
        # Confirm deletion
        if not confirm:
            response = input(f'\nAre you sure you want to delete user "{email}" and all related data? (yes/no): ')
            if response.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Deletion cancelled.'))
                return
        
        # Delete the user
        try:
            with transaction.atomic():
                user.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deleted user "{email}" and all related data.')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error deleting user: {str(e)}')
            ) 