"""
This file exists to allow Railway to find the application.
It simply imports the WSGI application from the backend.
"""
import os
import sys

# Add the backend directory to the Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_dir)

from backend.expert_system.wsgi import application 