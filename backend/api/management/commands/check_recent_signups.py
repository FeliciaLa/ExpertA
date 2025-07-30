from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import User

class Command(BaseCommand):
    help = 'Check recent user signups with filtering options'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', 
            type=int, 
            default=7, 
            help='Number of days to look back (default: 7)'
        )
        parser.add_argument(
            '--role', 
            type=str, 
            choices=['all', 'user', 'expert', 'admin'],
            default='all',
            help='Filter by user role (default: all)'
        )
        parser.add_argument(
            '--status', 
            type=str, 
            choices=['all', 'active', 'inactive'],
            default='all',
            help='Filter by active status (default: all)'
        )
        parser.add_argument(
            '--limit', 
            type=int, 
            default=50,
            help='Maximum number of results to show (default: 50)'
        )

    def handle(self, *args, **options):
        days = options['days']
        role = options['role']
        status = options['status']
        limit = options['limit']
        
        # Calculate the date threshold
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Build the query
        queryset = User.objects.filter(date_joined__gte=cutoff_date)
        
        # Apply role filter
        if role != 'all':
            queryset = queryset.filter(role=role)
        
        # Apply status filter
        if status == 'active':
            queryset = queryset.filter(is_active=True)
        elif status == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        # Order by most recent first and limit results
        users = queryset.order_by('-date_joined')[:limit]
        
        # Display results
        total_count = queryset.count()
        
        self.stdout.write(f"\n=== Recent Signups (Last {days} days) ===")
        self.stdout.write(f"Total found: {total_count}")
        self.stdout.write(f"Showing: {min(limit, total_count)} results")
        self.stdout.write(f"Filters: Role={role}, Status={status}")
        self.stdout.write("=" * 50)
        
        if not users:
            self.stdout.write(self.style.WARNING("No users found matching criteria"))
            return
        
        for user in users:
            # Status indicator
            status_icon = "✓" if user.is_active else "⚠"
            verification_status = "Verified" if user.is_active else "Unverified"
            
            self.stdout.write(f"\n{status_icon} {user.name} ({user.email})")
            self.stdout.write(f"   Role: {user.role.title()}")
            self.stdout.write(f"   Status: {verification_status}")
            self.stdout.write(f"   Joined: {user.date_joined.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            
            if user.role == 'expert':
                onboarding_status = "Complete" if user.onboarding_completed else "Pending"
                self.stdout.write(f"   Onboarding: {onboarding_status}")
        
        # Summary statistics
        self.stdout.write(f"\n=== Summary ===")
        active_count = queryset.filter(is_active=True).count()
        inactive_count = queryset.filter(is_active=False).count()
        
        self.stdout.write(f"Active users: {active_count}")
        self.stdout.write(f"Inactive users: {inactive_count}")
        
        # Role breakdown
        if role == 'all':
            expert_count = queryset.filter(role='expert').count()
            user_count = queryset.filter(role='user').count()
            admin_count = queryset.filter(role='admin').count()
            
            self.stdout.write(f"\nRole breakdown:")
            self.stdout.write(f"  Experts: {expert_count}")
            self.stdout.write(f"  Users: {user_count}")
            self.stdout.write(f"  Admins: {admin_count}")