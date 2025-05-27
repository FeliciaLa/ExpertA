FROM python:3.9-slim

WORKDIR /app

# Install Node.js (since Railway seems to prefer npm)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gnupg \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire project
COPY . /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app:/app/backend \
    PATH="/app:/app/backend:${PATH}"

# Install Python dependencies - move this after setting PYTHONPATH
RUN pip install --upgrade pip && \
    pip install django==4.2.11 djangorestframework==3.14.0 gunicorn==21.2.0 && \
    pip install -r backend/requirements-railway.txt || pip install -r backend/requirements.txt

# Make startup script executable
RUN chmod +x /app/start-django.sh

# Create debug directory for troubleshooting
RUN mkdir -p /app/debug

# Print Python info for debugging
RUN echo "Python version:" > /app/debug/python_info.txt && \
    python --version >> /app/debug/python_info.txt && \
    echo "Pip version:" >> /app/debug/python_info.txt && \
    pip --version >> /app/debug/python_info.txt && \
    echo "Installed packages:" >> /app/debug/python_info.txt && \
    pip list >> /app/debug/python_info.txt && \
    echo "Python path:" >> /app/debug/python_info.txt && \
    python -c "import sys; print(sys.path)" >> /app/debug/python_info.txt

# Verify Django installation
RUN python -c "import django; print('Django version:', django.get_version())" > /app/debug/django_check.txt

# Run database migrations and collectstatic
RUN cd backend && \
    python manage.py migrate && \
    python manage.py collectstatic --noinput

# Update start script to use correct paths
COPY start-django.sh /app/
RUN sed -i 's|PYTHONPATH="\$PYTHONPATH:/app:/app/backend"|PYTHONPATH="/app:/app/backend:\$PYTHONPATH"|' /app/start-django.sh

# Set working directory to app root
WORKDIR /app

# Start the Django application (either using script or CMD will work)
CMD ["/app/start-django.sh"] 