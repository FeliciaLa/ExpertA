#!/bin/bash

# Echo each command and exit on error
set -ex

echo "===== ENVIRONMENT INFORMATION ====="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "PATH: $PATH"
echo "NODE_VERSION: $(node -v || echo 'Node not found')"
echo "NPM_VERSION: $(npm -v || echo 'NPM not found')"

echo "===== SETTING UP PYTHON ====="
# Try multiple methods to install Python
if command -v apt-get &> /dev/null; then
  echo "Installing Python using apt-get..."
  apt-get update
  apt-get install -y python3 python3-pip python3-dev build-essential
elif command -v yum &> /dev/null; then
  echo "Installing Python using yum..."
  yum update -y
  yum install -y python3 python3-pip
elif command -v brew &> /dev/null; then
  echo "Installing Python using brew..."
  brew install python3
else
  echo "No package manager found, checking if Python is already installed"
fi

# Create symlinks explicitly
echo "Creating symlinks..."
if [ -f /usr/bin/python3 ]; then
  ln -sf /usr/bin/python3 /usr/bin/python || true
fi
if [ -f /usr/bin/pip3 ]; then
  ln -sf /usr/bin/pip3 /usr/bin/pip || true
fi

# Check Python installation
echo "Python paths:"
which python3 || echo "python3 not found in PATH"
which python || echo "python not found in PATH"
which pip3 || echo "pip3 not found in PATH"
which pip || echo "pip not found in PATH"

# Display Python version
python3 --version || python --version || echo "No Python executable found"
pip3 --version || pip --version || echo "No pip executable found"

# Make sure pip is up to date
python3 -m pip install --upgrade pip || python -m pip install --upgrade pip || echo "Failed to upgrade pip"

echo "===== INSTALLING PYTHON PACKAGES ====="
# Find requirements.txt file
if [ -f "backend/requirements-railway.txt" ]; then
  echo "Installing from backend/requirements-railway.txt..."
  python3 -m pip install -r backend/requirements-railway.txt || python -m pip install -r backend/requirements-railway.txt
elif [ -f "backend/requirements.txt" ]; then
  echo "Installing from backend/requirements.txt..."
  python3 -m pip install -r backend/requirements.txt || python -m pip install -r backend/requirements.txt
else
  echo "Requirements file not found!"
  exit 1
fi

echo "===== CHECKING BACKEND DIRECTORY ====="
if [ -d "backend" ]; then
  echo "Backend directory found, listing contents:"
  ls -la backend
  
  echo "===== RUNNING MIGRATIONS ====="
  cd backend
  echo "Changed to directory: $(pwd)"
  python3 manage.py migrate || python manage.py migrate || echo "Migration failed but continuing"
  
  echo "===== COLLECTING STATIC FILES ====="
  python3 manage.py collectstatic --noinput || python manage.py collectstatic --noinput || echo "Collectstatic failed but continuing"
  
  echo "===== CHECKING FOR NODE_MODULES ====="
  if [ ! -d "node_modules" ] && [ -f "package.json" ]; then
    echo "Installing Node dependencies..."
    npm install --only=prod || echo "npm install failed but continuing"
  fi
  
  cd ..
else
  echo "Backend directory not found!"
  # Create detailed error information
  mkdir -p debug
  echo "Current directory: $(pwd)" > debug/error_info.txt
  echo "Directory listing:" >> debug/error_info.txt
  ls -la >> debug/error_info.txt
  echo "Environment variables:" >> debug/error_info.txt
  env >> debug/error_info.txt
  exit 1
fi

echo "===== SETUP COMPLETE =====" 