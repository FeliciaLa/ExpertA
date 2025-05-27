FROM python:3.9-slim

WORKDIR /app

# Copy everything directly
COPY backend/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Use system package manager to install packages directly
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    pip install --no-cache-dir -r requirements-docker.txt && \
    apt-get purge -y --auto-remove gcc python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Start the application
CMD gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT 