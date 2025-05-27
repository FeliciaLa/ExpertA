from django.core.management.base import BaseCommand
from api.models import OnboardingQuestion

class Command(BaseCommand):
    help = 'Sets up the initial onboarding questions for expert profiles'

    def handle(self, *args, **kwargs):
        questions = [
            {
                'order': 1,
                'category': 'background',
                'text': 'What is your educational background and professional journey that led you to your current field?'
            },
            {
                'order': 2,
                'category': 'industry',
                'text': 'Which industry or sector do you primarily work in, and what are its key characteristics?'
            },
            {
                'order': 3,
                'category': 'experience',
                'text': 'How many years of experience do you have in your field?'
            },
            {
                'order': 4,
                'category': 'skills',
                'text': 'What are your core technical skills and areas of expertise?'
            },
            {
                'order': 5,
                'category': 'problems',
                'text': 'What are the most common problems or challenges you help solve in your work?'
            },
            {
                'order': 6,
                'category': 'methodologies',
                'text': 'What methodologies, frameworks, or approaches do you use in your work?'
            },
            {
                'order': 7,
                'category': 'tools',
                'text': 'What tools, technologies, or software do you use regularly?'
            },
            {
                'order': 8,
                'category': 'certifications',
                'text': 'Do you have any relevant certifications or specialized training? Please describe them.'
            },
            {
                'order': 9,
                'category': 'background',
                'text': 'What unique perspectives or experiences set you apart in your field?'
            },
            {
                'order': 10,
                'category': 'problems',
                'text': 'Can you describe a particularly challenging project or problem you solved, and how you approached it?'
            }
        ]

        for question in questions:
            OnboardingQuestion.objects.update_or_create(
                order=question['order'],
                defaults={
                    'category': question['category'],
                    'question_text': question['text'],
                    'is_active': True
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully set up onboarding questions')) 