from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from api.models import Expert, User


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

        # Check if it's a User
        try:
            user = User.objects.get(email=email)
            user_type = "User"
            user_obj = user
        except User.DoesNotExist:
            user_obj = None

        # Check if it's an Expert
        try:
            expert = Expert.objects.get(email=email)
            expert_type = "Expert"
            expert_obj = expert
        except Expert.DoesNotExist:
            expert_obj = None

        # If neither found
        if not user_obj and not expert_obj:
            self.stdout.write(
                self.style.ERROR(f'No user or expert found with email: {email}')
            )
            return

        # Delete the user/expert
        if user_obj:
            self.stdout.write(f'Found User: {user_obj.name} ({user_obj.email})')
            user_obj.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted User: {email}')
            )

        if expert_obj:
            self.stdout.write(f'Found Expert: {expert_obj.name} ({expert_obj.email})')
            expert_obj.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted Expert: {email}')
            ) 