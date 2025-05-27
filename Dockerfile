FROM python:3.9-slim

WORKDIR /app

# Install only necessary system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the minimal required files
COPY backend/expert_system /app/expert_system
COPY backend/api /app/api
COPY backend/manage.py /app/manage.py

# Create empty directory for media and static files
RUN mkdir -p /app/media /app/staticfiles

# Install minimal dependencies needed for Django
RUN pip install --no-cache-dir \
    django==4.2.11 \
    djangorestframework==3.14.0 \
    django-cors-headers==4.3.1 \
    gunicorn==21.2.0 \
    PyJWT==2.8.0

# Create a SQLite database file to ensure permissions are correct
RUN touch /app/db.sqlite3 && chmod 666 /app/db.sqlite3

# Set environment variables to force SQLite
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH="/app"
ENV DJANGO_SETTINGS_MODULE="expert_system.settings"
ENV RAILWAY_STATIC_URL="true"
ENV DATABASE_URL=""
ENV DB_HOST=""

# Expose the port
EXPOSE 8000
ENV PORT=8000

# Create a simple startup script
RUN echo '#!/bin/bash\ncd /app\npython manage.py migrate\npython manage.py collectstatic --noinput\ngunicorn --bind 0.0.0.0:${PORT:-8000} expert_system.wsgi' > /app/start.sh
RUN chmod +x /app/start.sh

# Run the startup script
CMD ["/app/start.sh"] 