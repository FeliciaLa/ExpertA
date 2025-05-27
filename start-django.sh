#!/bin/bash
set -e

echo "Running Django start script"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

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
    echo "Python location: $(which python3 || which python || echo 'Not found')" >> /app/debug/env_debug.txt
    
    exit 1
fi

# Set environment variables - note the order is important
export PYTHONUNBUFFERED=1
export PYTHONPATH="/app:/app/backend:${PYTHONPATH:-}"
export DJANGO_SETTINGS_MODULE="expert_system.settings"

echo "Environment variables:"
echo "PYTHONPATH: $PYTHONPATH"
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"

# Verify Python installation
echo "Python information:"
python3 --version || python --version || echo "python not found"
which python3 || which python || echo "python not found in PATH"

# Test Django import
echo "Testing Django import..."
python3 -c "import django; print('Django version:', django.get_version())" || \
python -c "import django; print('Django version:', django.get_version())" || \
echo "Failed to import Django - this will cause startup to fail"

# Try installing Django explicitly if not found
if ! python3 -c "import django" 2>/dev/null && ! python -c "import django" 2>/dev/null; then
    echo "Django not found, attempting to install..."
    pip install django==4.2.11 || pip3 install django==4.2.11 || echo "Failed to install Django"
fi

# Start Django
echo "Starting Django server on port ${PORT:-8000}"
python3 manage.py runserver "0.0.0.0:${PORT:-8000}" || \
python manage.py runserver "0.0.0.0:${PORT:-8000}" || \
echo "Failed to start Django server" 