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

# Copy health check and startup script
COPY health_server.py start.sh ./
RUN chmod +x start.sh health_server.py

# Copy project
COPY backend/ ./backend/

# Copy any necessary files from root
COPY .env* ./

# Collect static files
RUN cd backend && python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000
EXPOSE 8001

# Set environment variable
ENV PORT=8000
ENV DJANGO_PORT=8001
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=expert_system.settings

# Start server
CMD ["./start.sh"] 