FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/ || exit 1

# Start the application
CMD gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT 