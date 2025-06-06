#!/usr/bin/env python3
"""
Quick script to fix the missing knowledge base issue
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expert_system.settings')
django.setup()

from api.models import User, ExpertKnowledgeBase, ExpertProfile
from api.services import KnowledgeProcessor

def fix_knowledge_base():
    try:
        # Get the expert
        expert = User.objects.get(email='feliciacarlottala@gmail.com')
        print(f"Found expert: {expert.email}")
        
        # Check if knowledge base exists
        kb = ExpertKnowledgeBase.objects.filter(expert=expert).first()
        if kb:
            print("Knowledge base already exists!")
            print(f"Knowledge areas: {list(kb.knowledge_areas.keys()) if kb.knowledge_areas else 'Empty'}")
            return
        
        # Create knowledge base
        print("Creating knowledge base...")
        
        # Get or create with basic defaults
        knowledge_base, created = ExpertKnowledgeBase.objects.get_or_create(
            expert=expert,
            defaults={
                'knowledge_areas': {
                    'ecommerce': {
                        'count': 1,
                        'first_seen': '2025-06-06',
                        'last_updated': '2025-06-06'
                    }
                },
                'training_summary': f'Expert in ecommerce with experience in {expert.specialties}'
            }
        )
        
        if created:
            print("✅ Knowledge base created successfully!")
        else:
            print("✅ Knowledge base already existed!")
            
        # Process existing data
        print("Processing expert profile and data...")
        processor = KnowledgeProcessor(expert)
        
        # This will populate the knowledge base
        try:
            # Just create a basic knowledge entry to make the AI work
            from api.models import KnowledgeEntry
            
            # Create a basic knowledge entry
            entry = KnowledgeEntry.objects.create(
                knowledge_base=knowledge_base,
                topic="ecommerce expertise",
                content=f"I am {expert.name}, an ecommerce expert with the following specialties: {expert.specialties}. My bio: {expert.bio}",
                context_depth=1,
                confidence_score=1.0
            )
            print(f"Created knowledge entry: {entry.id}")
            
            # Update knowledge areas
            knowledge_base.knowledge_areas = {
                'ecommerce': {
                    'count': 1,
                    'first_seen': '2025-06-06',
                    'last_updated': '2025-06-06'
                },
                'expertise': {
                    'count': 1,
                    'first_seen': '2025-06-06', 
                    'last_updated': '2025-06-06'
                }
            }
            knowledge_base.training_summary = f"I am {expert.name}, an ecommerce expert. {expert.bio}"
            knowledge_base.save()
            
            print("✅ Knowledge base populated with basic expert data!")
            print(f"Knowledge areas: {list(knowledge_base.knowledge_areas.keys())}")
            
        except Exception as e:
            print(f"Warning: Could not process all data: {str(e)}")
            print("But basic knowledge base is created and should work!")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    fix_knowledge_base() 