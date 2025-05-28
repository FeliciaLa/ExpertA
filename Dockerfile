FROM python:3.10-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them first (for better caching)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend project directly into the /app directory
COPY backend/ /app/

# Verify Django project structure
RUN ls -la && \
    if [ ! -f "manage.py" ]; then \
      echo "ERROR: manage.py not found in /app - Docker build context may be incorrect"; \
      exit 1; \
    fi

# Run migrations
RUN python manage.py collectstatic --noinput || echo "Collectstatic failed - continuing build"

# Expose port
EXPOSE 8000

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=expert_system.settings

# Start Gunicorn directly
CMD gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT --log-level debug --timeout 300 --workers 2 