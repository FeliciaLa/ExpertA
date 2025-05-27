FROM python:3.9-slim

WORKDIR /app

# Copy source code
COPY backend/ /app/

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Install dependencies explicitly with pip
RUN pip install --no-cache-dir gunicorn==21.2.0 && \
    pip install --no-cache-dir django==4.2.11 djangorestframework==3.14.0 && \
    pip install --no-cache-dir djangorestframework-simplejwt==5.3.1 PyJWT==2.8.0 && \
    pip install --no-cache-dir django-cors-headers==4.3.1 python-dotenv==1.0.0 whitenoise==6.6.0

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Start the application using the entrypoint script
CMD ["/app/entrypoint.sh"] 