from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Delete an expert account by email address'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address of the expert to delete')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            # Find the user with this email
            user = User.objects.get(email=email)
            
            # Check if it's an expert
            if hasattr(user, 'role') and user.role == 'expert':
                user_type = 'expert'
            elif hasattr(user, 'is_expert_user') and user.is_expert_user():
                user_type = 'expert'
            else:
                user_type = 'user'
            
            self.stdout.write(f"Found {user_type}: {user.email} (ID: {user.id})")
            self.stdout.write(f"Name: {user.name if hasattr(user, 'name') else 'N/A'}")
            self.stdout.write(f"Is Active: {user.is_active}")
            self.stdout.write(f"Date Joined: {user.date_joined}")
            
            # Confirm deletion
            self.stdout.write(self.style.WARNING(f"About to delete {user_type} account: {email}"))
            
            # Delete the user and all related objects
            user.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {user_type} account: {email}'
                )
            )
            
            # Verify deletion
            try:
                User.objects.get(email=email)
                self.stdout.write(self.style.ERROR(f"ERROR: User {email} still exists after deletion!"))
            except User.DoesNotExist:
                self.stdout.write(self.style.SUCCESS(f"Confirmed: User {email} has been completely removed from database"))
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'No user found with email: {email}')
            ) 