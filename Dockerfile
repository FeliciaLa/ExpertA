FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire project
COPY . /app/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r backend/requirements-railway.txt || pip install -r backend/requirements.txt

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app:/app/backend

# Run database migrations and collectstatic
RUN cd backend && \
    python manage.py migrate && \
    python manage.py collectstatic --noinput

# Set working directory to backend
WORKDIR /app/backend

# Start the Django application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"] 