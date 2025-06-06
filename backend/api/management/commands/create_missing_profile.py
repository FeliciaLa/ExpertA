from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import User, ExpertProfile, OnboardingAnswer

class Command(BaseCommand):
    help = 'Create missing ExpertProfile from existing onboarding answers'

    def truncate_field(self, text, max_length):
        """Truncate text to fit database field constraints"""
        if not text:
            return text
        return text[:max_length] if len(text) > max_length else text

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
            
            # Extract years of experience as integer
            years_exp_text = answer_dict.get(3, '0')
            years_exp = 0
            try:
                # Extract number from text like "over 10 years" or "10 years"
                import re
                numbers = re.findall(r'\d+', years_exp_text)
                if numbers:
                    years_exp = int(numbers[0])
            except:
                years_exp = 0
            
            # Create ExpertProfile from onboarding answers with field length limits
            profile = ExpertProfile.objects.create(
                expert=user,
                industry=self.truncate_field(answer_dict.get(2, 'Not specified'), 255),
                years_of_experience=years_exp,
                key_skills=answer_dict.get(4, 'Not specified'),  # TextField, no limit
                typical_problems=answer_dict.get(5, 'Not specified'),  # TextField, no limit
                background=answer_dict.get(1, 'Not specified'),  # TextField, no limit
                certifications=answer_dict.get(8, ''),  # TextField, no limit
                methodologies=answer_dict.get(6, ''),  # TextField, no limit
                tools_technologies=answer_dict.get(7, '')  # TextField, no limit
            )
            
            self.stdout.write(self.style.SUCCESS(f"Created ExpertProfile for {user.email}"))
            self.stdout.write(f"Industry: {profile.industry}")
            self.stdout.write(f"Years of experience: {profile.years_of_experience}")
            self.stdout.write(f"Key skills: {profile.key_skills[:100]}...")
            self.stdout.write(f"Background: {profile.background[:100]}...")
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("User not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating profile: {e}")) 