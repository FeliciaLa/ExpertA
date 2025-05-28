#!/bin/bash
set -e

echo "Starting Django application on Railway..."
echo "Current directory: $(pwd)"
echo "Python version: $(python --version)"

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Start Gunicorn
echo "Starting Gunicorn..."
gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT --log-level debug --timeout 120 