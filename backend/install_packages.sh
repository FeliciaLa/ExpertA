#!/bin/bash
set -e

echo "Installing JWT packages..."
pip install djangorestframework-simplejwt==5.3.1 PyJWT==2.8.0

echo "Packages installed successfully"
echo "Installed packages:"
pip list | grep -E "djangorestframework-simplejwt|PyJWT"

# Print Django version
pip list | grep Django

echo "Installation complete!" 