FROM python:3.9-slim

WORKDIR /app

# Copy requirements first (for better caching)
COPY backend/requirements.txt /app/requirements.txt

# Install dependencies with verbose output
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn==21.2.0 && \
    ls -la /usr/local/bin/ && \
    echo "PATH is $PATH"

# Copy application code
COPY backend/ /app/

# Create a startup script
RUN echo '#!/bin/sh\n\
echo "Current directory: $(pwd)"\n\
echo "PATH=$PATH"\n\
echo "Python location: $(which python)"\n\
echo "Gunicorn location:"\n\
find / -name gunicorn 2>/dev/null || echo "Gunicorn not found"\n\
echo "Starting with direct path..."\n\
exec /usr/local/bin/python -m gunicorn expert_system.wsgi:application --bind 0.0.0.0:$PORT\n\
' > /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Use the startup script
ENTRYPOINT ["/app/start.sh"] 