FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install dependencies first for better caching
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Make sure migrations and static files are handled
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE ${PORT}

# Run the application (no shell execution)
ENTRYPOINT ["gunicorn"]
CMD ["expert_system.wsgi:application", "--bind", "0.0.0.0:8000"] 