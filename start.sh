#!/bin/bash
set -e

echo "==============================================="
echo "Starting Django application on Railway..."
echo "==============================================="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "-----------------------------------------------"

# If manage.py is not in the current directory, try to find it
if [ ! -f "manage.py" ]; then
    echo "ERROR: manage.py not found in current directory"
    echo "Searching for manage.py in subdirectories..."
    MANAGE_PY_PATH=$(find . -name "manage.py" -type f | head -n 1)
    
    if [ -n "$MANAGE_PY_PATH" ]; then
        echo "Found manage.py at: $MANAGE_PY_PATH"
        MANAGE_DIR=$(dirname "$MANAGE_PY_PATH")
        echo "Changing directory to: $MANAGE_DIR"
        cd "$MANAGE_DIR"
        echo "New current directory: $(pwd)"
    else
        echo "FATAL ERROR: Could not find manage.py in any subdirectory"
        echo "Contents of current directory:"
        find . -type f | grep -v "node_modules" | sort
        exit 1
    fi
fi

echo "Python version: $(python --version)"
echo "Installed packages:"
pip list

# Check Python path and settings
echo "PYTHONPATH: $PYTHONPATH"
echo "Django settings module: $DJANGO_SETTINGS_MODULE"

# Test if Django is properly installed
echo "Testing Django installation..."
python -m django --version || { 
    echo "Django not installed or not in PYTHONPATH"; 
    exit 1; 
}

# Test if the wsgi module can be imported
echo "Testing WSGI module import..."
python -c "import expert_system.wsgi" || { 
    echo "WSGI module import failed";
    echo "Available Python modules:"
    python -c "import sys; print(sys.path)";
    echo "Trying to find wsgi.py files:"
    find . -name "wsgi.py" -type f;
    exit 1; 
}

# Run collectstatic to make sure static files are available
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Collectstatic warning (continuing anyway)"

# Run check to verify the Django project
echo "Running Django check..."
python manage.py check || echo "Django check warning (continuing anyway)"

# Run migrations
echo "Running migrations..."
python manage.py migrate || { echo "Migrations failed"; exit 1; }

# Set PORT to default if not provided
PORT=${PORT:-8000}
echo "Using PORT: $PORT"

# Start Gunicorn with proper error handling
echo "==============================================="
echo "Starting Gunicorn on port $PORT..."
echo "==============================================="
exec gunicorn expert_system.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --log-level debug \
    --timeout 300 \
    --workers 2 \
    --capture-output \
    --error-logfile - \
    --access-logfile - \
    --enable-stdio-inheritance 