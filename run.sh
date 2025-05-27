#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Use Python's built-in server
cd backend
echo "Running with Python's built-in server..."
python -m django runserver 0.0.0.0:${PORT:-8000} 