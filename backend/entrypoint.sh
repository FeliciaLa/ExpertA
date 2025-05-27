#!/bin/bash
set -e

# Print debugging information
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Python version:"
python --version
echo "PATH environment:"
echo $PATH
echo "Installed packages:"
pip list

# Start the application
echo "Starting application with gunicorn..."
python -m gunicorn expert_system.wsgi:application --bind 0.0.0.0:${PORT:-8000} 