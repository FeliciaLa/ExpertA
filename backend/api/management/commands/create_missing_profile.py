from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import User, ExpertProfile, OnboardingAnswer

class Command(BaseCommand):
    help = 'Create missing ExpertProfile from existing onboarding answers'

    def handle(self, *args, **options):
        """Create ExpertProfile from onboarding answers for users who completed onboarding but missing profile"""
        
        try:
            user = User.objects.get(email='feliciacarlottala@gmail.com')
            
            # Check if profile already exists
            if ExpertProfile.objects.filter(expert=user).exists():
                self.stdout.write(self.style.WARNING(f"ExpertProfile already exists for {user.email}"))
                return
            
            # Get onboarding answers
            answers = OnboardingAnswer.objects.filter(expert=user).order_by('question__order')
            
            if answers.count() == 0:
                self.stdout.write(self.style.ERROR(f"No onboarding answers found for {user.email}"))
                return
            
            # Extract answers by question order
            answer_dict = {}
            for answer in answers:
                answer_dict[answer.question.order] = answer.answer
                self.stdout.write(f"Q{answer.question.order}: {answer.answer[:50]}...")
            
            # Create ExpertProfile from onboarding answers
            profile = ExpertProfile.objects.create(
                expert=user,
                industry=answer_dict.get(2, 'Not specified'),
                years_of_experience=int(answer_dict.get(3, '0')) if answer_dict.get(3, '0').isdigit() else 0,
                key_skills=answer_dict.get(4, 'Not specified'),
                typical_problems=answer_dict.get(5, 'Not specified'),
                background=answer_dict.get(1, 'Not specified'),
                certifications=answer_dict.get(8, ''),
                methodologies=answer_dict.get(6, ''),
                tools_technologies=answer_dict.get(7, '')
            )
            
            self.stdout.write(self.style.SUCCESS(f"Created ExpertProfile for {user.email}"))
            self.stdout.write(f"Industry: {profile.industry}")
            self.stdout.write(f"Years of experience: {profile.years_of_experience}")
            self.stdout.write(f"Key skills: {profile.key_skills}")
            self.stdout.write(f"Background: {profile.background}")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("User not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating profile: {e}")) 