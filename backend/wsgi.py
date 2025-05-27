"""
WSGI config for backend project.
"""
import os
import sys

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from expert_system.wsgi import application 