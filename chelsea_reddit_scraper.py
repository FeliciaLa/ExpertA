"""
Reddit Data Collector for Chelsea Persona
Scrapes student-relevant posts from UK/London subreddits
"""

import praw
import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv('.env.reddit')  # Load Reddit-specific env file

class RedditScraper:
    def __init__(self):
        """Initialize Reddit API client"""
        self.reddit = praw.Reddit(
            client_id=os.getenv('REDDIT_CLIENT_ID'),
            client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
            user_agent='Chelsea Research Bot 1.0'
        )
        
        # Target subreddits for student content
        self.target_subreddits = [
            'UniUK',           # UK university discussions
            'london',          # London general
            'UKPersonalFinance', # Money discussions
            'CasualUK',        # Casual UK chat
            'BritishProblems', # Relatable complaints
            'UKStudents',      # Student specific
            'AskUK',           # General questions
            'unitedkingdom'    # UK general
        ]
        
        # Keywords that indicate "Chelsea-like" content
        self.chelsea_indicators = {
            'age_indicators': [
                '20', '2nd year', 'second year', 'uni', 'university',
                'student', 'studying', 'degree', 'undergrad'
            ],
            'location_indicators': [
                'london', 'chelsea', 'south ken', 'zone 1', 'zone 2', 
                'central london', 'sw', 'kensington', 'fulham'
            ],
            'financial_indicators': [
                'broke', 'expensive', 'student loan', 'budget', 'cheap',
                'money', 'rent', 'cost', 'afford', 'skint', 'tight'
            ],
            'lifestyle_indicators': [
                'flatmate', 'housemate', 'literally', 'omg', 'tbh',
                'mad', 'peak', 'mental', 'proper', 'bare'
            ],
            'student_life': [
                'lectures', 'essays', 'exams', 'dissertation', 'library',
                'semester', 'term', 'graduation', 'freshers'
            ]
        }

    def scrape_posts(self, limit_per_subreddit: int = 100, days_back: int = 30) -> List[Dict]:
        """
        Scrape relevant posts from target subreddits
        
        Args:
            limit_per_subreddit: Number of posts to check per subreddit
            days_back: How many days back to look for posts
            
        Returns:
            List of relevant posts with metadata
        """
        all_posts = []
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        print(f"🔍 Starting Reddit scrape from {len(self.target_subreddits)} subreddits...")
        
        for subreddit_name in self.target_subreddits:
            try:
                print(f"\n📍 Scraping r/{subreddit_name}...")
                subreddit = self.reddit.subreddit(subreddit_name)
                
                # Get hot posts
                posts_checked = 0
                posts_collected = 0
                
                for submission in subreddit.hot(limit=limit_per_subreddit):
                    posts_checked += 1
                    
                    # Check if post is recent enough
                    post_date = datetime.fromtimestamp(submission.created_utc)
                    if post_date < cutoff_date:
                        continue
                    
                    # Process the post
                    processed_post = self._process_submission(submission, subreddit_name)
                    if processed_post:
                        all_posts.append(processed_post)
                        posts_collected += 1
                
                print(f"   ✅ Checked {posts_checked} posts, collected {posts_collected} relevant ones")
                
            except Exception as e:
                print(f"   ❌ Error scraping r/{subreddit_name}: {str(e)}")
                continue
        
        print(f"\n🎉 Total posts collected: {len(all_posts)}")
        return all_posts

    def _process_submission(self, submission, subreddit_name: str) -> Optional[Dict]:
        """
        Process a single Reddit submission and determine if it's Chelsea-relevant
        
        Args:
            submission: PRAW submission object
            subreddit_name: Name of the subreddit
            
        Returns:
            Processed post dict if relevant, None if not relevant
        """
        # Combine title and text for analysis
        full_text = f"{submission.title} {submission.selftext}"
        
        # Skip if too short or empty
        if len(full_text.strip()) < 20:
            return None
        
        # Calculate relevance score
        relevance_score = self._calculate_relevance(full_text)
        
        # Only keep posts with decent relevance (adjust threshold as needed)
        if relevance_score < 2:
            return None
        
        # Clean and anonymize the content
        cleaned_content = self._clean_and_anonymize(full_text)
        
        return {
            'content': cleaned_content,
            'subreddit': subreddit_name,
            'relevance_score': relevance_score,
            'post_id': submission.id,
            'created_utc': submission.created_utc,
            'upvotes': submission.score,
            'num_comments': submission.num_comments,
            'collected_at': datetime.now().isoformat()
        }

    def _calculate_relevance(self, text: str) -> int:
        """
        Calculate how relevant a post is to Chelsea's persona
        
        Args:
            text: Post content to analyze
            
        Returns:
            Relevance score (higher = more relevant)
        """
        text_lower = text.lower()
        score = 0
        
        # Check each category of indicators
        for category, keywords in self.chelsea_indicators.items():
            category_matches = sum(1 for keyword in keywords if keyword in text_lower)
            
            if category == 'age_indicators':
                score += category_matches * 3  # Age indicators are very important
            elif category == 'location_indicators':
                score += category_matches * 2  # Location somewhat important
            elif category == 'financial_indicators':
                score += category_matches * 2  # Money talk is relevant
            else:
                score += category_matches * 1  # Other indicators
        
        return score

    def _clean_and_anonymize(self, text: str) -> str:
        """
        Clean and anonymize post content
        
        Args:
            text: Raw post content
            
        Returns:
            Cleaned and anonymized text
        """
        # Remove usernames (u/username)
        text = re.sub(r'u/\w+', '[USER]', text)
        
        # Remove subreddit mentions (r/subreddit)
        text = re.sub(r'r/\w+', '[SUBREDDIT]', text)
        
        # Remove URLs
        text = re.sub(r'http\S+|www\.\S+', '[URL]', text)
        
        # Remove specific personal details (phone numbers, emails, etc.)
        text = re.sub(r'\b\d{11}\b', '[PHONE]', text)  # UK phone numbers
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
        
        # Remove postcode patterns
        text = re.sub(r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b', '[POSTCODE]', text)
        
        # Clean up extra whitespace
        text = ' '.join(text.split())
        
        return text.strip()

    def save_posts(self, posts: List[Dict], filename: str = None) -> str:
        """
        Save collected posts to JSON file
        
        Args:
            posts: List of post dictionaries
            filename: Optional custom filename
            
        Returns:
            Path to saved file
        """
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chelsea_reddit_posts_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(posts, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved {len(posts)} posts to {filename}")
        return filename

    def filter_high_quality_posts(self, posts: List[Dict], min_score: int = 4) -> List[Dict]:
        """
        Filter posts to only keep high-quality, relevant ones
        
        Args:
            posts: List of all collected posts
            min_score: Minimum relevance score to keep
            
        Returns:
            Filtered list of high-quality posts
        """
        filtered = [post for post in posts if post['relevance_score'] >= min_score]
        print(f"🔥 Filtered to {len(filtered)} high-quality posts (score >= {min_score})")
        return filtered

def main():
    """
    Example usage of the Reddit scraper
    """
    # Create scraper instance
    scraper = RedditScraper()
    
    # Scrape posts (adjust parameters as needed)
    posts = scraper.scrape_posts(
        limit_per_subreddit=200,  # Check more posts per subreddit
        days_back=14              # Look back 2 weeks
    )
    
    # Filter for high-quality posts only
    high_quality_posts = scraper.filter_high_quality_posts(posts, min_score=3)
    
    # Save to file
    filename = scraper.save_posts(high_quality_posts)
    
    # Print some stats
    print(f"\n📊 COLLECTION SUMMARY:")
    print(f"   Total posts collected: {len(posts)}")
    print(f"   High-quality posts: {len(high_quality_posts)}")
    print(f"   Saved to: {filename}")
    
    # Show a sample post
    if high_quality_posts:
        print(f"\n📝 SAMPLE POST:")
        sample = high_quality_posts[0]
        print(f"   Subreddit: r/{sample['subreddit']}")
        print(f"   Relevance: {sample['relevance_score']}")
        print(f"   Content: {sample['content'][:200]}...")

if __name__ == "__main__":
    main()