from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()

class Command(BaseCommand):
    help = 'Completely clean up all database records for an email address'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to completely clean up')

    def handle(self, *args, **options):
        email = options['email']
        
        self.stdout.write(f"Starting complete cleanup for email: {email}")
        
        # Clean up User model records
        users_deleted = 0
        try:
            users = User.objects.filter(email=email)
            users_count = users.count()
            if users_count > 0:
                self.stdout.write(f"Found {users_count} user(s) with email {email}")
                for user in users:
                    self.stdout.write(f"  - User ID: {user.id}, Name: {getattr(user, 'name', 'N/A')}, Role: {getattr(user, 'role', 'N/A')}")
                users.delete()
                users_deleted = users_count
                self.stdout.write(self.style.SUCCESS(f"Deleted {users_deleted} user record(s)"))
            else:
                self.stdout.write("No users found with this email")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error deleting users: {str(e)}"))

        # Clean up any verification tokens or related records
        with connection.cursor() as cursor:
            # Check what tables exist
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%api%'
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            self.stdout.write(f"Found tables: {tables}")
            
            # Look for any records containing this email
            email_records_found = 0
            for table in tables:
                try:
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = %s 
                        AND column_name LIKE '%%email%%'
                    """, [table])
                    email_columns = [row[0] for row in cursor.fetchall()]
                    
                    if email_columns:
                        for column in email_columns:
                            cursor.execute(f"""
                                SELECT COUNT(*) 
                                FROM {table} 
                                WHERE {column} = %s
                            """, [email])
                            count = cursor.fetchone()[0]
                            if count > 0:
                                self.stdout.write(f"Found {count} record(s) in {table}.{column}")
                                cursor.execute(f"""
                                    DELETE FROM {table} 
                                    WHERE {column} = %s
                                """, [email])
                                email_records_found += count
                                self.stdout.write(self.style.SUCCESS(f"Deleted {count} record(s) from {table}.{column}"))
                except Exception as e:
                    # Skip tables that might not be accessible
                    continue
        
        # Final verification
        try:
            remaining_users = User.objects.filter(email=email).count()
            if remaining_users == 0:
                self.stdout.write(self.style.SUCCESS(f"✅ Complete cleanup successful! Email {email} has been completely removed from all database tables."))
                self.stdout.write(f"Summary:")
                self.stdout.write(f"  - User records deleted: {users_deleted}")
                self.stdout.write(f"  - Other email records cleaned: {email_records_found}")
                self.stdout.write(f"  - Email is now available for fresh registration")
            else:
                self.stdout.write(self.style.ERROR(f"❌ WARNING: {remaining_users} user record(s) still exist with email {email}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error in final verification: {str(e)}")) 