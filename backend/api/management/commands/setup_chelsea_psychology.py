from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import User, PsychologicalProfile

class Command(BaseCommand):
    help = 'Create psychological profile for Chelsea persona'

    def handle(self, *args, **options):
        try:
            # Get or create Chelsea
            chelsea, created = User.objects.get_or_create(
                email="reynoldssophia26@gmail.com",
                defaults={
                    'name': 'Chelsea Reynolds',
                    'role': User.Role.EXPERT,
                    'is_active': True,
                    'bio': 'University student at King\'s College London studying Business Management',
                    'specialties': 'Student life, London living, business studies',
                    'onboarding_completed': True,
                    'onboarding_completed_at': timezone.now(),
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created Chelsea user: {chelsea.name}"))
            else:
                self.stdout.write(f"Found existing Chelsea: {chelsea.name}")
            
            # Create or update psychological profile
            profile, created = PsychologicalProfile.objects.update_or_create(
                expert=chelsea,
                defaults={
                    'core_values': [
                        'security', 
                        'belonging', 
                        'authenticity', 
                        'achievement',
                        'family_approval'
                    ],
                    'fears': [
                        'financial_instability',
                        'social_rejection', 
                        'academic_failure',
                        'disappointing_family',
                        'missing_out'
                    ],
                    'motivations': [
                        'family_approval',
                        'peer_acceptance',
                        'career_success',
                        'financial_security',
                        'social_belonging'
                    ],
                    'decision_patterns': {
                        'financial': 'anxious_researcher - overthinks purchases, compares prices extensively, seeks validation from friends',
                        'social': 'people_pleaser - prioritizes group harmony, fears exclusion, follows social trends',
                        'career': 'security_focused - values stable opportunities over risky ventures, influenced by family expectations',
                        'academic': 'perfectionist_tendency - high standards, stress about grades, seeks external validation'
                    },
                    'emotional_triggers': [
                        'money_stress',
                        'exclusion_fear', 
                        'family_expectations',
                        'academic_pressure',
                        'peer_judgment',
                        'future_uncertainty'
                    ],
                    'contradictions': [
                        {
                            'values': 'sustainability and environmental consciousness',
                            'behavior': 'buys fast fashion when stressed or wanting to fit in'
                        },
                        {
                            'values': 'financial responsibility',
                            'behavior': 'impulse purchases on social media recommendations'
                        },
                        {
                            'values': 'authenticity',
                            'behavior': 'changes opinions to match friend group preferences'
                        }
                    ],
                    'communication_style': {
                        'tone': 'friendly',
                        'language_patterns': ['literally', 'tbh', 'like', 'I mean', 'you know'],
                        'emotional_expression': 'expressive but seeks validation',
                        'formality': 'casual_british_student'
                    },
                    'personality_traits': {
                        'openness': 0.7,        # Open to new experiences but cautious
                        'conscientiousness': 0.8, # High standards, organized
                        'extraversion': 0.6,     # Social but needs alone time
                        'agreeableness': 0.8,    # People-pleasing tendency
                        'neuroticism': 0.6       # Moderate anxiety, especially about money/future
                    },
                    'worldview': {
                        'outlook': 'cautiously_optimistic',
                        'priorities': [
                            'family_relationships',
                            'academic_success', 
                            'financial_security',
                            'social_connections',
                            'personal_growth'
                        ],
                        'beliefs': [
                            'hard work leads to success',
                            'family opinions matter most',
                            'fitting in is important for happiness',
                            'education is the path to security',
                            'money causes stress but is necessary'
                        ]
                    },
                    'confidence_score': 0.9,  # High confidence in this profile
                    'updated_at': timezone.now()
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created new psychological profile for Chelsea"))
            else:
                self.stdout.write(self.style.SUCCESS(f"✓ Updated existing psychological profile for Chelsea"))
            
            # Display summary
            self.stdout.write(f"\n📊 Chelsea's Psychological Profile Summary:")
            self.stdout.write(f"Core Values: {', '.join(profile.core_values)}")
            self.stdout.write(f"Key Fears: {', '.join(profile.fears[:3])}")
            self.stdout.write(f"Main Motivations: {', '.join(profile.motivations[:3])}")
            self.stdout.write(f"Communication Style: {profile.communication_style.get('tone', 'N/A')}")
            self.stdout.write(f"Confidence Score: {profile.confidence_score}")
            
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Chelsea is ready for psychological persona interactions!"))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Chelsea user not found. Make sure reynoldssophia26@gmail.com exists."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error setting up Chelsea's psychology: {str(e)}"))