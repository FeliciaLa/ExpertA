#!/bin/bash
set -e

echo "Installing Python and dependencies..."
apt-get update
apt-get install -y python3 python3-pip
ln -sf /usr/bin/python3 /usr/bin/python
ln -sf /usr/bin/pip3 /usr/bin/pip

echo "Installing Python packages..."
pip install -r backend/requirements-railway.txt

echo "Running migrations..."
cd backend
python manage.py migrate

echo "Setup complete!" 