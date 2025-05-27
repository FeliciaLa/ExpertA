#!/bin/sh
set -e

echo "Current directory: $(pwd)"
echo "PATH: $PATH"
echo "Python location options:"
which python || echo "Python not found in PATH"
find / -name python -type f 2>/dev/null || echo "No Python found in filesystem"

# Try to run with python directly
echo "Running Django server..."
cd backend
python -m django runserver 0.0.0.0:${PORT:-8000} 