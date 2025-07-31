from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Create psychological profiling tables manually'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            self.stdout.write("Creating psychological profiling tables...")
            
            # Create PsychologicalProfile table
            try:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS "psychological_profiles" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, 
                        "core_values" text NOT NULL, 
                        "fears" text NOT NULL, 
                        "motivations" text NOT NULL, 
                        "decision_patterns" text NOT NULL, 
                        "emotional_triggers" text NOT NULL, 
                        "contradictions" text NOT NULL, 
                        "communication_style" text NOT NULL, 
                        "personality_traits" text NOT NULL, 
                        "worldview" text NOT NULL, 
                        "created_at" datetime NOT NULL, 
                        "updated_at" datetime NOT NULL, 
                        "confidence_score" real NOT NULL,
                        "expert_id" char(32) NOT NULL UNIQUE REFERENCES "api_user" ("id")
                    )
                ''')
                self.stdout.write(self.style.SUCCESS("✓ Created psychological_profiles table"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠ psychological_profiles: {e}"))
            
            # Create Interview table
            try:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS "interviews" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, 
                        "title" varchar(200) NOT NULL, 
                        "interviewer" varchar(100) NOT NULL, 
                        "duration_minutes" integer NULL, 
                        "audio_file" varchar(100) NULL, 
                        "transcript" text NOT NULL, 
                        "status" varchar(20) NOT NULL, 
                        "error_message" text NOT NULL, 
                        "raw_psychological_data" text NOT NULL, 
                        "created_at" datetime NOT NULL, 
                        "processed_at" datetime NULL,
                        "expert_id" char(32) NOT NULL REFERENCES "api_user" ("id")
                    )
                ''')
                self.stdout.write(self.style.SUCCESS("✓ Created interviews table"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠ interviews: {e}"))
            
            # Create EnhancedMemory table  
            try:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS "enhanced_memories" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, 
                        "content" text NOT NULL, 
                        "summary" varchar(300) NOT NULL, 
                        "psychological_tags" text NOT NULL, 
                        "emotional_context" varchar(50) NOT NULL, 
                        "values_involved" text NOT NULL, 
                        "memory_type" varchar(50) NOT NULL, 
                        "confidence_score" real NOT NULL, 
                        "source" varchar(100) NOT NULL, 
                        "vector_id" varchar(100) NOT NULL, 
                        "created_at" datetime NOT NULL, 
                        "last_accessed" datetime NOT NULL,
                        "expert_id" char(32) NOT NULL REFERENCES "api_user" ("id")
                    )
                ''')
                self.stdout.write(self.style.SUCCESS("✓ Created enhanced_memories table"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠ enhanced_memories: {e}"))
            
            # Create PersonaSession table
            try:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS "persona_sessions" (
                        "id" char(32) NOT NULL PRIMARY KEY, 
                        "session_type" varchar(20) NOT NULL, 
                        "research_objective" text NOT NULL, 
                        "started_at" datetime NOT NULL, 
                        "ended_at" datetime NULL, 
                        "duration_minutes" integer NOT NULL, 
                        "status" varchar(20) NOT NULL, 
                        "total_messages" integer NOT NULL, 
                        "research_notes" text NOT NULL,
                        "persona_id" char(32) NOT NULL REFERENCES "api_user" ("id"),
                        "researcher_id" char(32) NOT NULL REFERENCES "api_user" ("id")
                    )
                ''')
                self.stdout.write(self.style.SUCCESS("✓ Created persona_sessions table"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠ persona_sessions: {e}"))
            
            self.stdout.write(self.style.SUCCESS("\n🎉 Psychological profiling tables created!"))