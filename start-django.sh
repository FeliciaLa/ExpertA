#!/bin/bash
set -e

echo "Running Django start script"

# Check if we're in the right directory
if [ -f "backend/manage.py" ]; then
    cd backend
    echo "Changed to backend directory"
elif [ -f "manage.py" ]; then
    echo "Already in correct directory"
else
    echo "Error: manage.py not found!"
    echo "Current directory: $(pwd)"
    echo "Directory contents: $(ls -la)"
    exit 1
fi

# Set environment variables
export PYTHONUNBUFFERED=1
export PYTHONPATH="$PYTHONPATH:/app:/app/backend"

# Print Python versions
python3 --version || echo "python3 not found"
python --version || echo "python not found"

# Start Django
echo "Starting Django server on port ${PORT:-8000}"
python3 manage.py runserver "0.0.0.0:${PORT:-8000}" || python manage.py runserver "0.0.0.0:${PORT:-8000}" 