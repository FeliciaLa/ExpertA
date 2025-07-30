"""
Feed Reddit data to Chelsea's knowledge base
Uses existing ExpertA infrastructure to populate Chelsea with student posts
"""

import json
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')  # For Heroku
sys.path.append('backend')  # For local
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expert_system.settings')
django.setup()

from api.models import User, TrainingMessage
from api.services import KnowledgeProcessor

def feed_reddit_to_chelsea(json_file_path: str, chelsea_email: str = "reynoldssophia26@gmail.com"):
    """
    Feed Reddit posts to Chelsea's knowledge base
    
    Args:
        json_file_path: Path to the Reddit posts JSON file
        chelsea_email: Chelsea's email address in the system
    """
    
    print(f"🎯 Starting to feed Reddit data to Chelsea ({chelsea_email})")
    
    # 1. Get Chelsea user
    try:
        chelsea = User.objects.get(email=chelsea_email)
        print(f"✅ Found Chelsea: {chelsea.name} (ID: {chelsea.id})")
    except User.DoesNotExist:
        print(f"❌ Chelsea not found with email: {chelsea_email}")
        return
    
    # 2. Load Reddit posts
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            reddit_posts = json.load(f)
        print(f"📁 Loaded {len(reddit_posts)} Reddit posts from {json_file_path}")
    except FileNotFoundError:
        print(f"❌ File not found: {json_file_path}")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON file: {e}")
        return
    
    # 3. Initialize knowledge processor
    try:
        processor = KnowledgeProcessor(chelsea)
        print(f"🧠 Initialized KnowledgeProcessor for Chelsea")
    except Exception as e:
        print(f"❌ Failed to initialize KnowledgeProcessor: {e}")
        return
    
    # 4. Process each Reddit post
    processed_count = 0
    skipped_count = 0
    
    for i, post in enumerate(reddit_posts):
        try:
            # Create a "fake" training message for each Reddit post
            # This reuses your existing training pipeline
            training_msg = TrainingMessage.objects.create(
                expert=chelsea,
                role='expert',  # Treat Reddit posts as "expert knowledge"
                content=post['content']
            )
            
            # Process through existing knowledge processor
            processor.process_training_message(training_msg)
            
            processed_count += 1
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"   📊 Processed {i + 1}/{len(reddit_posts)} posts...")
                
        except Exception as e:
            print(f"   ⚠️  Skipped post {i + 1}: {str(e)}")
            skipped_count += 1
            continue
    
    # 5. Summary
    print(f"\n🎉 COMPLETION SUMMARY:")
    print(f"   ✅ Successfully processed: {processed_count} posts")
    print(f"   ⚠️  Skipped: {skipped_count} posts")
    print(f"   📚 Chelsea's knowledge base populated with {processed_count} student experiences")
    print(f"   🚀 Chelsea is now ready to chat with authentic student voice!")

def main():
    """Main function for command line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Feed Reddit data to Chelsea\'s knowledge base')
    parser.add_argument('json_file', help='Path to Reddit posts JSON file')
    parser.add_argument('--email', default='reynoldssophia26@gmail.com', 
                       help='Chelsea\'s email address (default: reynoldssophia26@gmail.com)')
    
    args = parser.parse_args()
    
    # Check if file exists
    if not os.path.exists(args.json_file):
        print(f"❌ File not found: {args.json_file}")
        return
    
    # Feed the data
    feed_reddit_to_chelsea(args.json_file, args.email)

if __name__ == "__main__":
    main()