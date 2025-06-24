from django.core.management.base import BaseCommand
from api.models import ExpertKnowledgeBase


class Command(BaseCommand):
    help = 'Clean up knowledge areas to remove GPT-generated descriptions'

    def handle(self, *args, **options):
        knowledge_bases = ExpertKnowledgeBase.objects.all()
        
        for kb in knowledge_bases:
            if kb.knowledge_areas:
                # Replace existing descriptions with simple topic names
                cleaned_areas = {}
                for topic in kb.knowledge_areas.keys():
                    cleaned_areas[topic] = f"Trained on: {topic}"
                
                kb.knowledge_areas = cleaned_areas
                kb.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Cleaned knowledge areas for expert {kb.expert.email}: {list(cleaned_areas.keys())}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully cleaned all knowledge areas')
        ) 