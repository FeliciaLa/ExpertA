#!/bin/bash

# Print environment for debugging
echo "Environment variables:"
env | sort

# Print current directory contents
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Make sure scripts are executable
chmod +x health_server.py

# Run the health check server in background for Railway
echo "Starting health check server..."
python health_server.py &
HEALTH_PID=$!

# Wait a moment to ensure health server starts
sleep 2

# Start Django application
echo "Starting Django application..."
cd backend
gunicorn expert_system.wsgi:application --bind 0.0.0.0:8001 --log-level debug

# If Django fails, kill the health server
kill $HEALTH_PID 