#!/usr/bin/env python3
"""
RAG Evaluation Script for ExpertA - Fixed Version
Tests RAG vs No-RAG performance on AWS knowledge questions
"""

import requests
import json
import time
from datetime import datetime
import pandas as pd

# Configuration
API_BASE_URL = "https://experta-backend-d64920064058.herokuapp.com/api"
EXPERT_EMAIL = "feliciacarlottala@gmail.com"

# Test queries
TEST_QUERIES = [
    # Cloud Concepts & AWS Basics
    "What are the four main benefits of cloud computing according to AWS?",
    "Which AWS service is designed for globally distributing content with low latency?",
    "What is the AWS Shared Responsibility Model, and what is AWS responsible for under it?",
    "Which AWS service is specifically used to store and retrieve any amount of data from anywhere?",
    "What are the three main types of cloud computing deployment models?",
    
    # Security & Compliance
    "What AWS service helps you centrally manage AWS accounts, organizational units, and policies?",
    "Which AWS service provides encryption key management and integrates with most AWS services?",
    "In the shared responsibility model, who is responsible for configuring IAM policies?",
    "Which AWS service automatically detects unusual activity and potential security threats?",
    "What is AWS Artifact used for?",
    
    # Pricing & Support
    "What are the three main AWS pricing models for EC2 instances?",
    "Which AWS pricing calculator can be used to estimate monthly costs for a solution?",
    "What is the difference between the AWS Basic Support plan and the Developer Support plan?",
    "Which AWS service lets you set alarms when your charges exceed a certain amount?",
    "How does AWS Free Tier differ between always free, 12-month free, and trial offers?",
    
    # Architecture & Service Categories
    "What are the five pillars of the AWS Well-Architected Framework?",
    "Which AWS database service is fully managed and compatible with MySQL and PostgreSQL?",
    "What AWS service allows you to run containerized applications without managing servers or clusters?",
    "Which AWS service is used for building workflows that coordinate multiple AWS services?",
    "What is the maximum size of an individual S3 object?"
]

class RAGEvaluator:
    def __init__(self, api_base_url, expert_email):
        self.api_base_url = api_base_url
        self.expert_email = expert_email
        self.results = []
        
    def get_auth_token(self):
        """Get authentication token - you'll need to implement this"""
        # TODO: Implement authentication
        # For now, you'll need to manually get a token from the browser
        return input("Please enter your Bearer token from the browser: ")
    
    def test_with_rag(self, query, auth_token):
        """Test query with RAG enabled"""
        headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'message': query,
            'expert_id': self.expert_email,
            'use_rag': True  # Explicitly enable RAG
        }
        
        start_time = time.time()
        response = requests.post(f"{self.api_base_url}/chat/", json=data, headers=headers)
        end_time = time.time()
        
        return {
            'response': response.json() if response.status_code == 200 else None,
            'status_code': response.status_code,
            'latency': end_time - start_time,
            'raw_response': response.text
        }
    
    def test_without_rag(self, query, auth_token):
        """Test query without RAG (direct LLM)"""
        headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'message': query,
            'expert_id': self.expert_email,
            'use_rag': False  # Explicitly disable RAG
        }
        
        start_time = time.time()
        response = requests.post(f"{self.api_base_url}/chat/", json=data, headers=headers)
        end_time = time.time()
        
        return {
            'response': response.json() if response.status_code == 200 else None,
            'status_code': response.status_code,
            'latency': end_time - start_time,
            'raw_response': response.text
        }
    
    def score_groundedness(self, response_text, query):
        """Score the groundedness of a response (1-10)"""
        # This is a simple heuristic - you might want to use an LLM judge
        score = 5  # Default score
        
        # Simple heuristics for scoring
        if response_text and len(response_text) > 50:
            # Check for specific AWS terms
            aws_terms = ['AWS', 'Amazon', 'EC2', 'S3', 'IAM', 'VPC', 'CloudFormation', 'CloudFront', 'RDS', 'Lambda']
            term_count = sum(1 for term in aws_terms if term.lower() in response_text.lower())
            
            # Check for uncertainty indicators
            uncertainty_terms = ['might', 'could', 'possibly', 'maybe', 'I think', 'probably', 'generally', 'typically']
            uncertainty_count = sum(1 for term in uncertainty_terms if term.lower() in response_text.lower())
            
            # Check for specific details (numbers, percentages, etc.)
            specific_details = ['99.9', '99.99', '99.999', '5TB', '5 GB', '5GB', '5 TB', 'millions', 'thousands']
            detail_count = sum(1 for detail in specific_details if detail.lower() in response_text.lower())
            
            # Adjust score based on these factors
            score = min(10, max(1, 5 + term_count + detail_count - uncertainty_count))
        
        return score
    
    def run_evaluation(self):
        """Run the full RAG evaluation"""
        print("Starting RAG Evaluation (Fixed Version)...")
        print(f"Testing {len(TEST_QUERIES)} queries for expert: {self.expert_email}")
        print("-" * 50)
        
        auth_token = self.get_auth_token()
        
        for i, query in enumerate(TEST_QUERIES, 1):
            print(f"\nQuery {i}/{len(TEST_QUERIES)}: {query[:50]}...")
            
            # Test with RAG
            print("  Testing with RAG...")
            rag_result = self.test_with_rag(query, auth_token)
            
            # Test without RAG
            print("  Testing without RAG...")
            no_rag_result = self.test_without_rag(query, auth_token)
            
            # Extract response text
            rag_response = rag_result['response']['response'] if rag_result['response'] else "No response"
            no_rag_response = no_rag_result['response']['response'] if no_rag_result['response'] else "No response"
            
            # Score groundedness
            rag_score = self.score_groundedness(rag_response, query)
            no_rag_score = self.score_groundedness(no_rag_response, query)
            
            # Store results
            result = {
                'query_number': i,
                'query': query,
                'rag_response': rag_response,
                'rag_score': rag_score,
                'rag_latency': rag_result['latency'],
                'rag_status': rag_result['status_code'],
                'no_rag_response': no_rag_response,
                'no_rag_score': no_rag_score,
                'no_rag_latency': no_rag_result['latency'],
                'no_rag_status': no_rag_result['status_code'],
                'timestamp': datetime.now().isoformat()
            }
            
            self.results.append(result)
            
            print(f"    RAG Score: {rag_score}/10, Latency: {rag_result['latency']:.2f}s")
            print(f"    No-RAG Score: {no_rag_score}/10, Latency: {no_rag_result['latency']:.2f}s")
            
            # Show if responses are different
            if rag_response != no_rag_response:
                print(f"    ✅ Responses are different!")
            else:
                print(f"    ⚠️  Responses are identical (suspicious)")
    
    def generate_report(self):
        """Generate evaluation report"""
        if not self.results:
            print("No results to report!")
            return
        
        df = pd.DataFrame(self.results)
        
        # Calculate metrics
        rag_avg_score = df['rag_score'].mean()
        no_rag_avg_score = df['no_rag_score'].mean()
        rag_avg_latency = df['rag_latency'].mean()
        no_rag_avg_latency = df['no_rag_latency'].mean()
        
        rag_fully_grounded = (df['rag_score'] >= 9).sum()
        no_rag_fully_grounded = (df['no_rag_score'] >= 9).sum()
        
        rag_hallucinations = (df['rag_score'] <= 3).sum()
        no_rag_hallucinations = (df['no_rag_score'] <= 3).sum()
        
        # Count different responses
        different_responses = (df['rag_response'] != df['no_rag_response']).sum()
        
        print("\n" + "="*60)
        print("RAG EVALUATION REPORT (FIXED VERSION)")
        print("="*60)
        print(f"Expert: {self.expert_email}")
        print(f"Total Queries: {len(self.results)}")
        print(f"Evaluation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        print("PERFORMANCE COMPARISON:")
        print("-" * 30)
        print(f"Average Groundedness Score:")
        print(f"  RAG:     {rag_avg_score:.2f}/10")
        print(f"  No-RAG:  {no_rag_avg_score:.2f}/10")
        print(f"  Improvement: {rag_avg_score - no_rag_avg_score:+.2f}")
        print()
        
        print(f"Fully Grounded Responses (9-10/10):")
        print(f"  RAG:     {rag_fully_grounded}/{len(self.results)} ({rag_fully_grounded/len(self.results)*100:.1f}%)")
        print(f"  No-RAG:  {no_rag_fully_grounded}/{len(self.results)} ({no_rag_fully_grounded/len(self.results)*100:.1f}%)")
        print()
        
        print(f"Hallucination Rate (0-3/10):")
        print(f"  RAG:     {rag_hallucinations}/{len(self.results)} ({rag_hallucinations/len(self.results)*100:.1f}%)")
        print(f"  No-RAG:  {no_rag_hallucinations}/{len(self.results)} ({no_rag_hallucinations/len(self.results)*100:.1f}%)")
        print()
        
        print(f"Average Response Time:")
        print(f"  RAG:     {rag_avg_latency:.2f}s")
        print(f"  No-RAG:  {no_rag_avg_latency:.2f}s")
        print(f"  Overhead: {rag_avg_latency - no_rag_avg_latency:+.2f}s")
        print()
        
        print(f"Response Differences:")
        print(f"  Different responses: {different_responses}/{len(self.results)} ({different_responses/len(self.results)*100:.1f}%)")
        print(f"  Identical responses: {len(self.results) - different_responses}/{len(self.results)} ({(len(self.results) - different_responses)/len(self.results)*100:.1f}%)")
        
        # Save detailed results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"rag_evaluation_fixed_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\nDetailed results saved to: {filename}")
        
        # Save summary to CSV
        csv_filename = f"rag_evaluation_fixed_summary_{timestamp}.csv"
        df.to_csv(csv_filename, index=False)
        print(f"Summary saved to: {csv_filename}")

def main():
    evaluator = RAGEvaluator(API_BASE_URL, EXPERT_EMAIL)
    evaluator.run_evaluation()
    evaluator.generate_report()

if __name__ == "__main__":
    main()
