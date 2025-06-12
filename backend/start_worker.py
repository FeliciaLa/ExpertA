#!/usr/bin/env python
"""
Script to start RQ workers for knowledge processing.
Usage: python start_worker.py [queue_name]
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

# Add the project directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expert_system.settings')
django.setup()

import django_rq
from django.conf import settings

def main():
    """Start RQ worker for knowledge processing"""
    
    # Get queue name from command line or use default
    queue_name = sys.argv[1] if len(sys.argv) > 1 else 'knowledge_processing'
    
    print(f"Starting RQ worker for queue: {queue_name}")
    print(f"Redis configuration: {settings.RQ_QUEUES.get(queue_name, 'Not found')}")
    
    try:
        # Get the queue
        queue = django_rq.get_queue(queue_name)
        
        # Get the worker
        worker = django_rq.get_worker(queue_name)
        
        print(f"Worker started for queue '{queue_name}'")
        print(f"Queue length: {len(queue)}")
        print("Waiting for jobs... (Press Ctrl+C to stop)")
        
        # Start the worker
        worker.work()
        
    except KeyboardInterrupt:
        print("\nWorker stopped by user")
    except Exception as e:
        print(f"Error starting worker: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 