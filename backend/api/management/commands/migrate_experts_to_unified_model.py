from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import User, Expert
import uuid

class Command(BaseCommand):
    help = 'Migrates existing experts to the unified User model with role=EXPERT'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting migration of experts to unified User model'))
        
        # Get counts
        expert_count = Expert.objects.count()
        user_count = User.objects.count()
        
        self.stdout.write(f'Found {expert_count} experts and {user_count} users')
        
        # Keep track of success/failure
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        # Process each expert
        for expert in Expert.objects.all():
            try:
                # Check if a user with this email already exists
                existing_user = User.objects.filter(email=expert.email).first()
                
                if existing_user:
                    self.stdout.write(
                        self.style.WARNING(f'User with email {expert.email} already exists, skipping expert')
                    )
                    skipped_count += 1
                    continue
                
                # Create a new user with expert role
                with transaction.atomic():
                    user = User(
                        id=expert.id,  # Use the same ID
                        email=expert.email,
                        name=expert.get_full_name() or expert.email,
                        role=User.Role.EXPERT,
                        is_active=expert.is_active,
                        is_staff=expert.is_staff,
                        is_superuser=expert.is_superuser,
                        date_joined=expert.date_joined,
                        bio=expert.bio,
                        specialties=expert.specialties,
                        title=expert.title,
                        onboarding_completed=expert.onboarding_completed,
                        onboarding_completed_at=expert.onboarding_completed_at,
                        profile_image=expert.profile_image,
                        total_training_messages=expert.total_training_messages,
                        last_training_at=expert.last_training_at,
                        verification_token=expert.verification_token,
                        verification_token_created_at=expert.verification_token_created_at
                    )
                    
                    # Set password hash directly
                    user.password = expert.password
                    
                    # Save without validation
                    user.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully migrated expert {expert.email} to unified User model')
                    )
                    success_count += 1
            
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error migrating expert {expert.email}: {str(e)}')
                )
                error_count += 1
        
        # Print summary
        self.stdout.write('-' * 50)
        self.stdout.write(self.style.SUCCESS(f'Migration complete:'))
        self.stdout.write(f'Total experts: {expert_count}')
        self.stdout.write(f'Successfully migrated: {success_count}')
        self.stdout.write(f'Skipped (already exists): {skipped_count}')
        self.stdout.write(f'Errors: {error_count}')
        
        if error_count == 0 and skipped_count == 0:
            self.stdout.write(self.style.SUCCESS('All experts were successfully migrated!'))
        else:
            self.stdout.write(
                self.style.WARNING('Migration completed with some issues. Check the output above for details.')
            ) 