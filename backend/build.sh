#!/bin/bash
set -e

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Installed packages:"
pip list

echo "Build complete!" 