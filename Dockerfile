FROM python:3.9-slim

WORKDIR /app

# Copy the entire project
COPY . /app/

# Install dependencies
RUN pip install -r backend/requirements.txt

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# We're not specifying CMD or ENTRYPOINT since Railway seems to ignore them 