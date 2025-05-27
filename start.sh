#!/bin/bash
set -e

# Print current directory for debugging
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Export environment variables
export PYTHONPATH="$PYTHONPATH:$(pwd):$(pwd)/backend"
export PORT="${PORT:-8000}"

# Run from backend directory without using cd
if [ -d "backend" ]; then
  echo "Found backend directory"
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" python backend/manage.py collectstatic --noinput || true
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" python backend/manage.py migrate || true
  PYTHONPATH="$PYTHONPATH:$(pwd)/backend" gunicorn --pythonpath backend expert_system.wsgi:application --bind 0.0.0.0:$PORT
else
  echo "No backend directory found, running from current directory"
  python manage.py collectstatic --noinput || true
  python manage.py migrate || true
  gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT
fi 