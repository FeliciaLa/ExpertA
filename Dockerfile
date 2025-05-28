FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY backend/ .

# Copy any necessary files from root
COPY .env* ./

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Set environment variable
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=expert_system.settings

# Start server
CMD gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT 