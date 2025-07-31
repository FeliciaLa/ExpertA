from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import User, Interview, PsychologicalProfile
from api.services import InterviewProcessor
import os

class Command(BaseCommand):
    help = 'Analyze interview transcript and update psychological profile'

    def add_arguments(self, parser):
        parser.add_argument('transcript_file', type=str, help='Path to the interview transcript file')
        parser.add_argument('--expert-email', type=str, default='reynoldssophia26@gmail.com', 
                          help='Email of the expert/persona (default: Chelsea)')
        parser.add_argument('--interviewer', type=str, default='Market Researcher',
                          help='Name of the interviewer')

    def handle(self, *args, **options):
        transcript_file = options['transcript_file']
        expert_email = options['expert_email']
        interviewer = options['interviewer']
        
        try:
            # Check if transcript file exists
            if not os.path.exists(transcript_file):
                self.stdout.write(self.style.ERROR(f"❌ Transcript file not found: {transcript_file}"))
                return
            
            # Read the transcript
            with open(transcript_file, 'r', encoding='utf-8') as f:
                transcript_content = f.read()
            
            self.stdout.write(f"📄 Loaded transcript: {len(transcript_content)} characters")
            self.stdout.write(f"📝 Preview: {transcript_content[:200]}...")
            
            # Get the expert
            try:
                expert = User.objects.get(email=expert_email)
                self.stdout.write(f"👤 Found expert: {expert.name}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"❌ Expert not found: {expert_email}"))
                return
            
            # Create interview record
            interview = Interview.objects.create(
                expert=expert,
                title=f"Psychological Analysis - {timezone.now().strftime('%Y-%m-%d')}",
                interviewer=interviewer,
                transcript=transcript_content,
                status=Interview.Status.UPLOADED
            )
            
            self.stdout.write(f"📊 Created interview record: {interview.id}")
            
            # Initialize the interview processor
            processor = InterviewProcessor()
            self.stdout.write("🧠 Initializing psychological analysis...")
            
            # Process the interview (this will extract psychology and update the profile)
            try:
                profile = processor.process_interview(interview)
                
                self.stdout.write(self.style.SUCCESS("✅ Psychological analysis completed!"))
                self.stdout.write(f"📈 Interview status: {interview.status}")
                
                # Display the extracted psychological data
                self.stdout.write("\n" + "="*60)
                self.stdout.write("🧠 PSYCHOLOGICAL ANALYSIS RESULTS")
                self.stdout.write("="*60)
                
                self.stdout.write(f"\n💎 CORE VALUES:")
                for value in profile.core_values:
                    self.stdout.write(f"  • {value}")
                
                self.stdout.write(f"\n😰 FEARS:")
                for fear in profile.fears:
                    self.stdout.write(f"  • {fear}")
                
                self.stdout.write(f"\n🎯 MOTIVATIONS:")
                for motivation in profile.motivations:
                    self.stdout.write(f"  • {motivation}")
                
                self.stdout.write(f"\n🧭 DECISION PATTERNS:")
                for category, pattern in profile.decision_patterns.items():
                    self.stdout.write(f"  • {category}: {pattern}")
                
                self.stdout.write(f"\n⚡ EMOTIONAL TRIGGERS:")
                for trigger in profile.emotional_triggers:
                    self.stdout.write(f"  • {trigger}")
                
                self.stdout.write(f"\n💭 COMMUNICATION STYLE:")
                comm_style = profile.communication_style
                self.stdout.write(f"  • Tone: {comm_style.get('tone', 'N/A')}")
                self.stdout.write(f"  • Language patterns: {', '.join(comm_style.get('language_patterns', []))}")
                self.stdout.write(f"  • Emotional expression: {comm_style.get('emotional_expression', 'N/A')}")
                
                self.stdout.write(f"\n🔄 CONTRADICTIONS:")
                for contradiction in profile.contradictions:
                    if isinstance(contradiction, dict):
                        values = contradiction.get('values', '')
                        behavior = contradiction.get('behavior', '')
                        self.stdout.write(f"  • Values {values} vs Behavior {behavior}")
                
                self.stdout.write(f"\n📊 PERSONALITY TRAITS:")
                for trait, score in profile.personality_traits.items():
                    self.stdout.write(f"  • {trait}: {score}")
                
                self.stdout.write(f"\n🌍 WORLDVIEW:")
                worldview = profile.worldview
                self.stdout.write(f"  • Outlook: {worldview.get('outlook', 'N/A')}")
                self.stdout.write(f"  • Priorities: {', '.join(worldview.get('priorities', []))}")
                
                self.stdout.write(f"\n🎯 CONFIDENCE SCORE: {profile.confidence_score}")
                
                self.stdout.write("\n" + "="*60)
                self.stdout.write(self.style.SUCCESS("🎉 Chelsea's psychological profile has been updated with real data!"))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Error during psychological analysis: {str(e)}"))
                self.stdout.write(f"📋 Interview record created but analysis failed")
                import traceback
                self.stdout.write(f"🔍 Traceback: {traceback.format_exc()}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            self.stdout.write(f"🔍 Traceback: {traceback.format_exc()}")