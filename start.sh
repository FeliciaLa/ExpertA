#!/bin/bash
set -e

# Print environment information for debugging
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Python version:"
python --version
echo "PATH environment:"
echo $PATH
echo "PYTHONPATH environment:"
echo $PYTHONPATH

# Export environment variables
export PYTHONPATH="$PYTHONPATH:$(pwd):$(pwd)/backend"
export PORT="${PORT:-8000}"

# Check if backend directory exists
if [ -d "backend" ]; then
  echo "Found backend directory"
  
  # Display backend contents for debugging
  echo "Backend directory contents:"
  ls -la backend
  
  # Run Django commands with appropriate pythonpath
  echo "Running collectstatic..."
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" python backend/manage.py collectstatic --noinput || echo "Collectstatic failed but continuing"
  
  echo "Running migrations..."
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" python backend/manage.py migrate || echo "Migrations failed but continuing"
  
  echo "Starting gunicorn server..."
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" gunicorn --pythonpath backend expert_system.wsgi:application --bind 0.0.0.0:$PORT
else
  echo "No backend directory found, running from current directory"
  # Display contents for debugging
  echo "Current directory contents:"
  ls -la
  
  echo "Running collectstatic..."
  python manage.py collectstatic --noinput || echo "Collectstatic failed but continuing"
  
  echo "Running migrations..."
  python manage.py migrate || echo "Migrations failed but continuing"
  
  echo "Starting gunicorn server..."
  gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT
fi 