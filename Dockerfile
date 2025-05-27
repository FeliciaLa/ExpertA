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

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r backend/requirements-railway.txt || pip install -r backend/requirements.txt

# Make startup script executable
RUN chmod +x /app/start-django.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app:/app/backend \
    PATH="/app:/app/backend:${PATH}"

# Run database migrations and collectstatic
RUN cd backend && \
    python manage.py migrate && \
    python manage.py collectstatic --noinput

# Set working directory to app root
WORKDIR /app

# Start the Django application (either using script or CMD will work)
CMD ["/app/start-django.sh"] 