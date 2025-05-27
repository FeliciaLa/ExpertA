#!/bin/bash
set -e

echo "Running Django start script"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Set up virtual environment path
VENV_PATH="/app/venv"
if [ -d "$VENV_PATH" ]; then
    echo "Activating virtual environment at $VENV_PATH"
    source "$VENV_PATH/bin/activate"
    # Verify activation
    echo "Virtual env: $VIRTUAL_ENV"
    echo "Which python: $(which python)"
else
    echo "Warning: Virtual environment not found at $VENV_PATH"
    # Try to create one if missing
    echo "Attempting to create virtual environment..."
    python3 -m venv "$VENV_PATH" || python -m venv "$VENV_PATH" || echo "Failed to create virtual environment"
    if [ -d "$VENV_PATH" ]; then
        source "$VENV_PATH/bin/activate"
        echo "Installing required packages..."
        pip install django==4.2.11 \
                  djangorestframework==3.14.0 \
                  django-cors-headers==4.3.1 \
                  gunicorn==21.2.0 \
                  python-dotenv==1.0.0 \
                  djangorestframework-simplejwt==5.3.1 \
                  PyJWT==2.8.0 \
                  whitenoise==6.6.0 \
                  pinecone-client==3.0.0 \
                  openai==1.6.0 \
                  bleach==6.0.0
    fi
fi

# Check if we're in the right directory
if [ -f "backend/manage.py" ]; then
    cd backend
    echo "Changed to backend directory: $(pwd)"
    echo "Backend directory contents: $(ls -la)"
elif [ -f "manage.py" ]; then
    echo "Already in correct directory: $(pwd)"
else
    echo "Error: manage.py not found!"
    echo "Current directory: $(pwd)"
    echo "Directory contents: $(ls -la)"
    
    echo "Searching for manage.py..."
    find / -name "manage.py" -type f 2>/dev/null || echo "No manage.py found on system"
    
    echo "Creating debug info..."
    mkdir -p /app/debug
    echo "PATH: $PATH" > /app/debug/env_debug.txt
    echo "PYTHONPATH: $PYTHONPATH" >> /app/debug/env_debug.txt
    echo "Current directory: $(pwd)" >> /app/debug/env_debug.txt
    echo "Directory listing: $(ls -la)" >> /app/debug/env_debug.txt
    echo "Python location: $(which python || echo 'Not found')" >> /app/debug/env_debug.txt
    
    exit 1
fi

# Set environment variables - note the order is important
export PYTHONUNBUFFERED=1
export PYTHONPATH="/app:/app/backend:${PYTHONPATH:-}"
export DJANGO_SETTINGS_MODULE="expert_system.settings"

echo "Environment variables:"
echo "PYTHONPATH: $PYTHONPATH"
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"
echo "VIRTUAL_ENV: $VIRTUAL_ENV"
echo "PATH: $PATH"

# Verify Python installation
echo "Python information:"
python --version || echo "python not found"
which python || echo "python not found in PATH"

# Test Django and packages import
echo "Testing Django import..."
python -c "import django; print('Django version:', django.get_version())" || echo "Failed to import Django"
python -c "import corsheaders; print('corsheaders found')" || echo "Failed to import corsheaders - installing now" && pip install django-cors-headers==4.3.1
python -c "import rest_framework; print('DRF found')" || echo "Failed to import DRF - installing now" && pip install djangorestframework==3.14.0
python -c "import rest_framework_simplejwt; print('JWT found')" || echo "Failed to import JWT - installing now" && pip install djangorestframework-simplejwt==5.3.1
python -c "import pinecone; print('Pinecone module found')" || echo "Failed to import Pinecone - installing now" && pip install pinecone-client==3.0.0
python -c "import openai; print('OpenAI module found')" || echo "Failed to import OpenAI - installing now" && pip install openai==1.6.0
python -c "import bleach; print('Bleach module found')" || echo "Failed to import Bleach - installing now" && pip install bleach==6.0.0

# Start Django
echo "Starting Django server on port ${PORT:-8000}"
python manage.py runserver "0.0.0.0:${PORT:-8000}" || echo "Failed to start Django server" 