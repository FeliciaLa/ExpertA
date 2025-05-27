FROM python:3.9-slim

WORKDIR /app

# Copy only the needed backend code
COPY backend/expert_system /app/expert_system
COPY backend/api /app/api
COPY backend/manage.py /app/manage.py

# Install just the minimal needed dependencies
RUN pip install django==4.2.11 \
    djangorestframework==3.14.0 \
    django-cors-headers==4.3.1 \
    gunicorn==21.2.0 \
    PyJWT==2.8.0

# Create a simple health check file
RUN mkdir -p /app/static
RUN echo '{"status":"ok"}' > /app/static/health.json

# Create a simple health check python script
RUN echo 'import http.server\nimport socketserver\nimport os\n\nPORT = int(os.environ.get("PORT", 8000))\nHandler = http.server.SimpleHTTPRequestHandler\n\nwith socketserver.TCPServer(("", PORT), Handler) as httpd:\n    print("serving at port", PORT)\n    httpd.serve_forever()' > /app/server.py

# Expose the port
EXPOSE 8000

# Set environment variable for port
ENV PORT=8000

# Start the simple Python HTTP server
CMD ["python", "server.py"] 