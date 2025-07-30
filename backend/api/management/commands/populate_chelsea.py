from django.core.management.base import BaseCommand
import json
from api.models import User, TrainingMessage
from api.services import KnowledgeProcessor

class Command(BaseCommand):
    help = 'Populate Chelsea\'s knowledge base with Reddit data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email', 
            type=str, 
            default='reynoldssophia26@gmail.com',
            help='Chelsea\'s email address'
        )
        parser.add_argument(
            '--limit', 
            type=int, 
            default=50,
            help='Limit number of posts to process (for testing)'
        )

    def handle(self, *args, **options):
        chelsea_email = options['email']
        limit = options['limit']
        
        self.stdout.write(f"🎯 Starting to populate Chelsea's knowledge base")
        self.stdout.write(f"   Email: {chelsea_email}")
        self.stdout.write(f"   Limit: {limit} posts")
        
        # 1. Get Chelsea user
        try:
            chelsea = User.objects.get(email=chelsea_email)
            self.stdout.write(self.style.SUCCESS(f"✅ Found Chelsea: {chelsea.name} (ID: {chelsea.id})"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Chelsea not found with email: {chelsea_email}"))
            return
        
        # 2. Sample Reddit posts (high-quality ones from our collection)
        # In production, you'd load from JSON file, but for Heroku we'll inline some good examples
        sample_posts = [
            {
                "content": "omg rent in zone 1 is literally killing me, paying £800 for a tiny room 😭 anyone else surviving on beans and toast this month? my student loan barely covers basic living costs",
                "relevance_score": 8
            },
            {
                "content": "does anyone else feel like they're the only broke student at uni? like everyone else seems to have money for nights out and I'm here calculating if I can afford the £3 meal deal",
                "relevance_score": 9
            },
            {
                "content": "flatmate drama update: so turns out my housemate has been eating my food AGAIN. I literally labeled everything and she's still taking my stuff. how do I deal with this without being a total b*tch?",
                "relevance_score": 7
            },
            {
                "content": "uni stress is real guys. between assignments, part-time job, and trying to have a social life I'm properly exhausted. anyone else feeling overwhelmed this term?",
                "relevance_score": 8
            },
            {
                "content": "PSA: Tesco meal deals at 3pm when they're reduced are literally a lifesaver for broke students. managed to get dinner for £1.50 yesterday #brokelife",
                "relevance_score": 9
            },
            {
                "content": "why is everything in london so expensive??? £6 for a pint, £15 for basic brunch, £800+ rent for a shoebox. how are we supposed to afford this on student budgets?",
                "relevance_score": 10
            },
            {
                "content": "anyone else's parents not understand how expensive london is? mine keep asking why I need more money when I already have student finance like... have you SEEN rent prices???",
                "relevance_score": 8
            },
            {
                "content": "library is my second home now because it's free, warm, and has wifi. plus I can't afford to study anywhere else lol. at least the heating works unlike my flat",
                "relevance_score": 7
            },
            {
                "content": "group project stress: when you're the only one actually doing work and everyone else is just coasting. like I get we're all busy but this is literally 50% of our grade???",
                "relevance_score": 6
            },
            {
                "content": "graduation is coming up and I'm lowkey terrified about finding a job. the job market is mad competitive and I still have student debt to pay off. anyone else panicking?",
                "relevance_score": 8
            },
            {
                "content": "tube strikes are the bane of my existence. I can't afford uber so I'm either walking 2 hours to uni or missing lectures. why is london transport so unreliable???",
                "relevance_stress": 7
            },
            {
                "content": "fresher's week was fun but my bank account is crying. spent way too much on nights out and now I'm living off pasta and tinned tomatoes for the rest of the month",
                "relevance_score": 9
            },
            {
                "content": "does anyone else feel like they're constantly behind on everything? uni work, social life, part-time job, keeping flat clean... there's literally not enough hours in the day",
                "relevance_score": 8
            },
            {
                "content": "love how lecturers assign group work like we all live within walking distance of each other. coordinating meetings when everyone's scattered across london is a nightmare",
                "relevance_score": 6
            },
            {
                "content": "mental health check: how is everyone coping? this term has been brutal and I feel like I'm barely keeping my head above water. uni stress + money stress = not fun",
                "relevance_score": 9
            },
            {
                "content": "tried to budget this month but literally everything costs more than expected. even the 'cheap' food at uni is like £8 for a sad sandwich. how do people afford to eat???",
                "relevance_score": 10
            },
            {
                "content": "flatmate left dishes in sink for 2 weeks despite multiple requests to clean up. I'm not their mum but living in filth isn't an option. confrontation is so awkward though",
                "relevance_score": 7
            },
            {
                "content": "part-time job at retail is killing my soul but I literally need the money to survive. balancing work and uni is exhausting but what choice do I have?",
                "relevance_score": 9
            },
            {
                "content": "anyone else feel like they're missing out on the 'university experience' because they can't afford it? nights out, society events, trips - everything costs money I don't have",
                "relevance_score": 10
            },
            {
                "content": "exam period + broke student life = living off energy drinks and stress. my diet is 90% caffeine and 10% whatever's on offer at the corner shop",
                "relevance_score": 8
            }
        ]
        
        # Limit posts if specified
        posts_to_process = sample_posts[:limit]
        
        # 3. Initialize knowledge processor
        try:
            processor = KnowledgeProcessor(chelsea)
            self.stdout.write(self.style.SUCCESS("🧠 Initialized KnowledgeProcessor for Chelsea"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Failed to initialize KnowledgeProcessor: {e}"))
            return
        
        # 4. Process each post
        processed_count = 0
        skipped_count = 0
        
        for i, post in enumerate(posts_to_process):
            try:
                # Create "training message" for each Reddit post
                training_msg = TrainingMessage.objects.create(
                    expert=chelsea,
                    role='expert',
                    content=post['content']
                )
                
                # Process through existing knowledge processor
                processor.process_training_message(training_msg)
                
                processed_count += 1
                self.stdout.write(f"   📝 Processed post {i+1}/{len(posts_to_process)}")
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"   ⚠️  Skipped post {i+1}: {str(e)}"))
                skipped_count += 1
                continue
        
        # 5. Summary
        self.stdout.write(f"\n🎉 COMPLETION SUMMARY:")
        self.stdout.write(self.style.SUCCESS(f"   ✅ Successfully processed: {processed_count} posts"))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f"   ⚠️  Skipped: {skipped_count} posts"))
        self.stdout.write(self.style.SUCCESS(f"   📚 Chelsea's knowledge base populated!"))
        self.stdout.write(self.style.SUCCESS(f"   🚀 Chelsea is now ready to chat with authentic student voice!"))