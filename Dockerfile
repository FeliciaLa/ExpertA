FROM python:3.9-slim

WORKDIR /app

# Install curl and other dependencies
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Start the application
CMD gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT 