from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import User, ConsultationSession
import uuid


class Command(BaseCommand):
    help = 'Mark an expert as having completed their activation payment'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address of the expert to mark as paid'
        )
        parser.add_argument(
            '--amount',
            type=float,
            default=9.99,
            help='Amount paid (default: 9.99)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if expert already has activation payment'
        )

    def handle(self, *args, **options):
        email = options['email']
        amount = options['amount']
        force = options['force']

        try:
            # Find the expert
            expert = User.objects.get(email=email, role=User.Role.EXPERT)
            self.stdout.write(f"Found expert: {expert.name} ({expert.email})")

        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Expert with email '{email}' not found or not an expert user")
            )
            return

        # Check if expert already has activation payment
        existing_activation = ConsultationSession.objects.filter(
            expert=expert,
            expert_industry="ACTIVATION",
            expert_specialty__startswith="ACTIVATION_PAYMENT_"
        ).first()

        if existing_activation and not force:
            self.stdout.write(
                self.style.WARNING(
                    f"Expert {expert.name} already has an activation payment record (Session ID: {existing_activation.id}). "
                    f"Use --force to create another one."
                )
            )
            return

        # Create a fake payment intent ID for the record
        fake_payment_intent_id = f"manual_activation_{uuid.uuid4().hex[:16]}"

        # Create the activation session record
        session = ConsultationSession.objects.create(
            user=expert,  # The expert is both user and expert for activation
            expert=expert,
            expert_name=expert.name or expert.email,
            expert_industry="ACTIVATION",  # Special marker for activation payments
            expert_specialty=f"ACTIVATION_PAYMENT_{fake_payment_intent_id}",  # Store payment ID
            status=ConsultationSession.Status.ACTIVE,
            total_messages=0,  # Track usage against 200 limit
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Successfully marked expert {expert.name} ({expert.email}) as paid!\n"
                f"   • Created activation session: {session.id}\n"
                f"   • Payment ID: {fake_payment_intent_id}\n"
                f"   • Amount: £{amount}\n"
                f"   • Expert now has 200 interaction limit"
            )
        )

        # Also enable monetization on their profile if they have one
        if hasattr(expert, 'profile'):
            profile = expert.profile
            if not profile.monetization_enabled:
                profile.monetization_enabled = True
                profile.save()
                self.stdout.write(f"   • Enabled monetization on expert profile")
        else:
            self.stdout.write(
                self.style.WARNING(f"   • Expert has no profile - monetization not enabled")
            ) 