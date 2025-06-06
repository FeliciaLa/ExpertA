from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Fix training tables to use UUID for expert_id fields'

    def handle(self, *args, **options):
        """Fix training tables to use UUID for expert_id fields"""
        
        cursor = connection.cursor()
        
        try:
            # Fix api_trainingmessage table
            self.stdout.write("Fixing api_trainingmessage table...")
            
            # Clear all training message entries to avoid conflicts
            cursor.execute("DELETE FROM api_trainingmessage;")
            
            # Drop the foreign key constraint if it exists
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'api_trainingmessage' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%expert_id%'
            """)
            
            fk_constraints = cursor.fetchall()
            for constraint in fk_constraints:
                cursor.execute(f"ALTER TABLE api_trainingmessage DROP CONSTRAINT {constraint[0]};")
            
            # Change expert_id column from bigint to UUID
            cursor.execute("""
                ALTER TABLE api_trainingmessage 
                ALTER COLUMN expert_id TYPE UUID USING expert_id::text::uuid;
            """)
            
            # Recreate the foreign key constraint
            cursor.execute("""
                ALTER TABLE api_trainingmessage 
                ADD CONSTRAINT api_trainingmessage_expert_id_fkey 
                FOREIGN KEY (expert_id) REFERENCES api_user(id) ON DELETE CASCADE;
            """)
            
            self.stdout.write(self.style.SUCCESS("Successfully fixed api_trainingmessage table"))
            
            # Fix training_sessions table
            self.stdout.write("Fixing training_sessions table...")
            
            # Clear all training session entries to avoid conflicts
            cursor.execute("DELETE FROM training_sessions;")
            
            # Drop the foreign key constraint if it exists
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'training_sessions' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%expert_id%'
            """)
            
            fk_constraints = cursor.fetchall()
            for constraint in fk_constraints:
                cursor.execute(f"ALTER TABLE training_sessions DROP CONSTRAINT {constraint[0]};")
            
            # Change expert_id column from bigint to UUID
            cursor.execute("""
                ALTER TABLE training_sessions 
                ALTER COLUMN expert_id TYPE UUID USING expert_id::text::uuid;
            """)
            
            # Recreate the foreign key constraint
            cursor.execute("""
                ALTER TABLE training_sessions 
                ADD CONSTRAINT training_sessions_expert_id_fkey 
                FOREIGN KEY (expert_id) REFERENCES api_user(id) ON DELETE CASCADE;
            """)
            
            self.stdout.write(self.style.SUCCESS("Successfully fixed training_sessions table"))
            
            # Also fix expert_knowledge_bases table if it exists
            self.stdout.write("Fixing expert_knowledge_bases table...")
            
            # Clear all knowledge base entries to avoid conflicts
            cursor.execute("DELETE FROM expert_knowledge_bases;")
            
            # Drop the foreign key constraint if it exists
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'expert_knowledge_bases' 
                AND constraint_type = 'FOREIGN KEY'
                AND constraint_name LIKE '%expert_id%'
            """)
            
            fk_constraints = cursor.fetchall()
            for constraint in fk_constraints:
                cursor.execute(f"ALTER TABLE expert_knowledge_bases DROP CONSTRAINT {constraint[0]};")
            
            # Change expert_id column from bigint to UUID
            cursor.execute("""
                ALTER TABLE expert_knowledge_bases 
                ALTER COLUMN expert_id TYPE UUID USING expert_id::text::uuid;
            """)
            
            # Recreate the foreign key constraint
            cursor.execute("""
                ALTER TABLE expert_knowledge_bases 
                ADD CONSTRAINT expert_knowledge_bases_expert_id_fkey 
                FOREIGN KEY (expert_id) REFERENCES api_user(id) ON DELETE CASCADE;
            """)
            
            self.stdout.write(self.style.SUCCESS("Successfully fixed expert_knowledge_bases table"))
            
            self.stdout.write(self.style.SUCCESS("All training tables fixed successfully!"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fixing training tables: {e}"))
            raise 