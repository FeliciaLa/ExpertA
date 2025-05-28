#!/bin/bash
set -e

echo "Starting Django application on Railway..."
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"
echo "Django version: $(python -m django --version)"
echo "Installed packages:"
pip list

# Check Python path and settings
echo "PYTHONPATH: $PYTHONPATH"
echo "Django settings module: $DJANGO_SETTINGS_MODULE"
echo "Listing files in current directory:"
ls -la

# Test if the wsgi module can be imported
echo "Testing WSGI module import..."
python -c "import expert_system.wsgi" || { echo "WSGI module import failed"; exit 1; }

# Run collectstatic to make sure static files are available
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Collectstatic warning (continuing anyway)"

# Run check to verify the Django project
echo "Running Django check..."
python manage.py check || echo "Django check warning (continuing anyway)"

# Run migrations
echo "Running migrations..."
python manage.py migrate || { echo "Migrations failed"; exit 1; }

# Start Gunicorn with proper error handling
echo "Starting Gunicorn..."
gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT --log-level debug --timeout 180 --workers 2 --capture-output --enable-stdio-inheritance 