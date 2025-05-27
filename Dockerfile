FROM python:3.9-slim

WORKDIR /app

# Copy requirements first (for better caching)
COPY backend/requirements.txt /app/requirements.txt

# Install dependencies and ensure gunicorn is globally available
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn==21.2.0 && \
    ln -sf /usr/local/bin/gunicorn /usr/bin/gunicorn

# Copy application code
COPY backend/ /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Start the application
CMD ["sh", "-c", "echo 'Starting gunicorn...' && echo 'PATH=$PATH' && which gunicorn && gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT"] 