#!/bin/bash
pip install --upgrade pip
pip install -r requirements-railway.txt
pip install djangorestframework-simplejwt==5.3.1 PyJWT==2.8.0 gunicorn==21.2.0
echo "Installed packages:"
pip list 