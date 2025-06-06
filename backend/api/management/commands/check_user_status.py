from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Check the status of a user by email address'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to check')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"\n=== User Status for {email} ===")
            self.stdout.write(f"User ID: {user.id}")
            self.stdout.write(f"Name: {user.name}")
            self.stdout.write(f"Email: {user.email}")
            self.stdout.write(f"Role: {user.role}")
            self.stdout.write(f"Is Active: {user.is_active}")
            self.stdout.write(f"Is Staff: {user.is_staff}")
            self.stdout.write(f"Is Superuser: {user.is_superuser}")
            self.stdout.write(f"Date Joined: {user.date_joined}")
            self.stdout.write(f"Verification Token: {user.verification_token}")
            self.stdout.write(f"Token Created At: {user.verification_token_created_at}")
            
            if user.role == 'expert':
                self.stdout.write(f"Bio: {user.bio}")
                self.stdout.write(f"Specialties: {user.specialties}")
                self.stdout.write(f"Onboarding Completed: {user.onboarding_completed}")
            
            self.stdout.write(f"\n=== Status Summary ===")
            if user.is_active:
                self.stdout.write(self.style.SUCCESS("✓ User is ACTIVE and can log in"))
            else:
                self.stdout.write(self.style.WARNING("⚠ User is INACTIVE - cannot log in"))
                
                if user.verification_token:
                    self.stdout.write("  Reason: Email not verified (has verification token)")
                else:
                    self.stdout.write("  Reason: Account deactivated (no verification token)")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ No user found with email: {email}"))
            
            # Check if there are any users with similar emails
            similar_users = User.objects.filter(email__icontains=email.split('@')[0])
            if similar_users.exists():
                self.stdout.write(f"\nSimilar emails found:")
                for user in similar_users:
                    self.stdout.write(f"  - {user.email} (Active: {user.is_active})")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error checking user: {str(e)}")) 