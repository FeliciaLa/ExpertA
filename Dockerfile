FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only the backend code
COPY backend /app/backend

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install \
    django==4.2.11 \
    djangorestframework==3.14.0 \
    django-cors-headers==4.3.1 \
    gunicorn==21.2.0 \
    python-dotenv==1.0.0 \
    djangorestframework-simplejwt==5.3.1 \
    PyJWT==2.8.0 \
    whitenoise==6.6.0 \
    pinecone-client==3.0.0 \
    openai==1.6.0 \
    psycopg2-binary==2.9.6 \
    dj-database-url==2.1.0 \
    bleach==6.0.0 \
    PyPDF2==3.0.1 \
    python-docx==0.8.11 \
    Pillow==10.1.0

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH="/app:/app/backend"
ENV DJANGO_SETTINGS_MODULE="expert_system.settings"
ENV PORT=8000

# Create health endpoint
RUN mkdir -p /app/backend/static
RUN echo '{"status":"ok"}' > /app/backend/static/health.json

# Change to the backend directory
WORKDIR /app/backend

# Create a standalone health view file
RUN echo 'from django.http import JsonResponse\n\ndef health(request):\n    return JsonResponse({"status": "ok"})' > health_view.py

# Run Django directly with simple health check
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:${PORT:-8000} expert_system.wsgi"] 