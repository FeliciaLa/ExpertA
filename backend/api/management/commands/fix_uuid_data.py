import uuid
from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = 'Fix UUID data in the database'

    def handle(self, *args, **options):
        self.stdout.write('Fixing UUID data...')
        
        # Create fresh test data
        with connection.cursor() as cursor:
            # Get table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='experts'")
            experts_exists = cursor.fetchone() is not None
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_user'")
            users_exists = cursor.fetchone() is not None
            
            if experts_exists:
                # Delete existing experts
                cursor.execute("DELETE FROM experts")
                
                # Create a new test expert
                expert_id = str(uuid.uuid4())
                hashed_password = make_password('password123')
                
                cursor.execute("""
                    INSERT INTO experts 
                    (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, bio, specialties, title, onboarding_completed, profile_image, total_training_messages)
                    VALUES 
                    (?, ?, NULL, 0, ?, ?, ?, ?, 0, 1, datetime('now'), ?, ?, ?, 0, NULL, 0)
                """, [
                    expert_id,
                    hashed_password,
                    'testexpert@example.com',
                    'Test',
                    'Expert',
                    'testexpert@example.com',
                    'Test expert for demonstration purposes',
                    'Software Development, AI, Machine Learning',
                    'Software Engineer'
                ])
                
                self.stdout.write(self.style.SUCCESS(f'Created test expert with ID {expert_id}'))
            else:
                self.stdout.write(self.style.WARNING('Experts table does not exist. Skipping.'))
            
            if users_exists:
                # Delete existing users
                cursor.execute("DELETE FROM api_user")
                
                # Create a new test user
                user_id = str(uuid.uuid4())
                hashed_password = make_password('password123')
                
                cursor.execute("""
                    INSERT INTO api_user
                    (id, password, email, name, date_joined, is_active, is_staff, is_superuser)
                    VALUES
                    (?, ?, ?, ?, datetime('now'), 1, 0, 0)
                """, [
                    user_id,
                    hashed_password,
                    'testuser@example.com',
                    'Test User'
                ])
                
                self.stdout.write(self.style.SUCCESS(f'Created test user with ID {user_id}'))
            else:
                self.stdout.write(self.style.WARNING('Users table does not exist. Skipping.'))
        
        self.stdout.write(self.style.SUCCESS('Test data created successfully!')) 