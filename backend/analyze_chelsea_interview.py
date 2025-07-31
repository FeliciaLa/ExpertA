#!/usr/bin/env python3
"""
Standalone script to analyze Chelsea's interview transcript and extract psychological insights.
This script can run on Heroku without requiring the new psychological models.
"""

import os
import sys
import django
import json
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
import openai
from api.models import User

def analyze_interview_transcript(transcript_file_path):
    """Analyze interview transcript and extract psychological profile"""
    
    # Read the transcript
    try:
        with open(transcript_file_path, 'r', encoding='utf-8') as f:
            transcript_content = f.read()
        print(f"📄 Loaded transcript: {len(transcript_content)} characters")
        print(f"📝 Preview: {transcript_content[:200]}...")
    except Exception as e:
        print(f"❌ Error reading transcript file: {e}")
        return None
    
    # Get Chelsea user
    try:
        chelsea = User.objects.get(email="reynoldssophia26@gmail.com")
        print(f"👤 Found expert: {chelsea.name}")
    except User.DoesNotExist:
        print("❌ Chelsea user not found")
        return None
    
    # Initialize OpenAI client
    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        print("🤖 OpenAI client initialized")
    except Exception as e:
        print(f"❌ Error initializing OpenAI client: {e}")
        return None
    
    # Analyze the transcript
    try:
        print("🧠 Initializing psychological analysis...")
        
        prompt = """Analyze this psychological interview transcript and extract a detailed personality profile.

Return ONLY valid JSON with this exact structure:
{{
    "core_values": ["list of 3-5 core values like security, authenticity, belonging"],
    "fears": ["list of 3-5 fears like financial_instability, social_rejection"],
    "motivations": ["list of 3-5 motivations like family_approval, peer_acceptance"],
    "decision_patterns": {{
        "financial": "description of how they make money decisions",
        "social": "description of how they make social decisions",
        "career": "description of how they make career decisions"
    }},
    "emotional_triggers": ["list of things that trigger strong emotions"],
    "contradictions": [
        {{
            "values": "what they value",
            "behavior": "contradictory behavior"
        }}
    ],
    "communication_style": {{
        "tone": "casual/formal/friendly/etc",
        "language_patterns": ["words/phrases they use frequently"],
        "emotional_expression": "how they express emotions"
    }},
    "personality_traits": {{
        "openness": 0.7,
        "conscientiousness": 0.6,
        "extraversion": 0.8,
        "agreeableness": 0.7,
        "neuroticism": 0.4
    }},
    "worldview": {{
        "outlook": "optimistic/pessimistic/realistic",
        "priorities": ["what matters most to them"],
        "beliefs": ["core beliefs about life"]
    }}
}}

IMPORTANT: Return ONLY the JSON object, no other text or explanation.

Interview Transcript:
{transcript}"""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt.format(transcript=transcript_content)}],
            temperature=0.3,
            max_tokens=2000
        )
        
        psychological_data = json.loads(response.choices[0].message.content)
        print("✅ Psychological analysis completed successfully!")
        
        # Display the results
        print("\n🎉 PSYCHOLOGICAL PROFILE EXTRACTED!")
        print("=" * 50)
        print(f"📊 Core Values: {', '.join(psychological_data['core_values'])}")
        print(f"😨 Key Fears: {', '.join(psychological_data['fears'])}")
        print(f"🎯 Main Motivations: {', '.join(psychological_data['motivations'])}")
        print(f"💬 Communication Style: {psychological_data['communication_style']['tone']}")
        print(f"🧠 Decision Patterns: {psychological_data['decision_patterns']}")
        print(f"⚡ Emotional Triggers: {', '.join(psychological_data['emotional_triggers'])}")
        print(f"🔄 Contradictions: {psychological_data['contradictions']}")
        print(f"👤 Personality Traits: {psychological_data['personality_traits']}")
        print(f"🌍 Worldview: {psychological_data['worldview']}")
        print("=" * 50)
        
        return psychological_data
        
    except Exception as e:
        print(f"❌ Error during psychological analysis: {e}")
        import traceback
        print(f"🔍 Traceback: {traceback.format_exc()}")
        return None

if __name__ == "__main__":
    transcript_file = "Chelsea_Interview_Simulation.txt"
    
    if not os.path.exists(transcript_file):
        print(f"❌ Transcript file not found: {transcript_file}")
        sys.exit(1)
    
    print("🔬 Starting Chelsea Interview Analysis...")
    print("=" * 50)
    
    result = analyze_interview_transcript(transcript_file)
    
    if result:
        print("\n✅ Analysis completed successfully!")
        print("💡 You can now use this psychological profile to enhance Chelsea's persona responses.")
    else:
        print("\n❌ Analysis failed. Please check the error messages above.")
        sys.exit(1) 