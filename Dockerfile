FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install them first (for better caching)
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ /app/

# Create a direct startup script
RUN echo '#!/bin/bash\n\
echo "Starting Django application..."\n\
python --version\n\
pip list\n\
echo "Using gunicorn from: $(which gunicorn)"\n\
gunicorn expert_system.wsgi:application --bind 0.0.0.0:${PORT:-8000}' > /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PATH="/app:${PATH}"

# Set the entrypoint
ENTRYPOINT ["/bin/bash", "/app/start.sh"] 