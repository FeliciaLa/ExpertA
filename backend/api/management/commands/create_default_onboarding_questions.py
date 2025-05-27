from django.core.management.base import BaseCommand
from api.models import OnboardingQuestion

class Command(BaseCommand):
    help = 'Creates default onboarding questions'

    def handle(self, *args, **options):
        # Define default questions
        default_questions = [
            {
                'question_text': 'What is your primary area of expertise?',
                'order': 1,
                'category': 'expertise'
            },
            {
                'question_text': 'Which industries have you worked in extensively?',
                'order': 2,
                'category': 'background'
            },
            {
                'question_text': 'What specific roles or titles have you held in your field?',
                'order': 3,
                'category': 'background'
            },
            {
                'question_text': 'How many years of experience do you have in your area of expertise?',
                'order': 4,
                'category': 'background'
            },
            {
                'question_text': 'What types of clients or companies have you advised or worked with?',
                'order': 5,
                'category': 'experience'
            },
            {
                'question_text': 'What are your top 3 specialized topics within your domain?',
                'order': 6,
                'category': 'specialization'
            },
            {
                'question_text': 'What key tools, frameworks, or methodologies do you use regularly?',
                'order': 7,
                'category': 'methodology'
            },
            {
                'question_text': 'Have you published any papers, articles, or given talks in your field?',
                'order': 8,
                'category': 'achievements'
            },
            {
                'question_text': 'What is your preferred level of engagement (strategic advice, technical deep-dives, etc.)?',
                'order': 9,
                'category': 'approach'
            },
            {
                'question_text': 'What sets your approach or knowledge apart from others in your field?',
                'order': 10,
                'category': 'differentiator'
            },
        ]

        # First, remove any existing questions
        existing_count = OnboardingQuestion.objects.count()
        if existing_count > 0:
            OnboardingQuestion.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f'Removed {existing_count} existing onboarding questions')
            )

        # Create questions
        created_count = 0
        for question_data in default_questions:
            OnboardingQuestion.objects.create(
                question_text=question_data['question_text'],
                order=question_data['order'],
                category=question_data['category'],
                is_active=True
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} onboarding questions')
        ) 