FROM python:3.9-slim

WORKDIR /app

# Copy only the essential files
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ /app/

# Create a Python server file that doesn't use gunicorn
RUN echo 'import os\n\
import sys\n\
import django\n\
from django.core.wsgi import get_wsgi_application\n\
from django.core.management import execute_from_command_line\n\
\n\
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expert_system.settings")\n\
application = get_wsgi_application()\n\
\n\
# Run migrations first\n\
sys.argv = ["manage.py", "migrate"]\n\
execute_from_command_line(sys.argv)\n\
\n\
# Start a basic server\n\
from wsgiref.simple_server import make_server\n\
\n\
port = int(os.environ.get("PORT", 8000))\n\
print(f"Starting server on port {port}...")\n\
httpd = make_server("0.0.0.0", port, application)\n\
httpd.serve_forever()\n\
' > /app/server.py

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Run the Python server directly
CMD ["python", "server.py"] 