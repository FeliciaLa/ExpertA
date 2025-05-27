# ExpertA Deployment Guide

This guide provides instructions for deploying the ExpertA application to a production environment.

## Prerequisites

- A server running Linux (Ubuntu 20.04 LTS or newer recommended)
- Python 3.8+ installed
- Node.js 18+ and npm installed
- Nginx or Apache web server
- PostgreSQL (optional, for production database)
- Domain name with SSL certificate

## Step 1: Clone the Repository

```bash
git clone https://github.com/FeliciaLa/ExpertA.git
cd ExpertA
```

## Step 2: Set Up Backend

1. Create a virtual environment and install dependencies:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn psycopg2-binary  # Additional production dependencies
```

2. Create `.env` file with production settings:

```
# Django settings
DJANGO_SECRET_KEY=your_secure_secret_key
DJANGO_DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database settings (if using PostgreSQL)
DB_NAME=experta
DB_USER=experta_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# API keys
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key

# Email settings
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your_email_password
DEFAULT_FROM_EMAIL=experta@example.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

3. Create the logs directory:

```bash
mkdir -p logs
```

4. Set up the database:

```bash
# If using SQLite (not recommended for production)
python manage.py migrate

# If using PostgreSQL
# First create the database:
# sudo -u postgres psql
# CREATE DATABASE experta;
# CREATE USER experta_user WITH PASSWORD 'your_secure_password';
# GRANT ALL PRIVILEGES ON DATABASE experta TO experta_user;
# \q

# Then run migrations using production settings
DJANGO_SETTINGS_MODULE=expert_system.production_settings python manage.py migrate
```

5. Create a superuser:

```bash
DJANGO_SETTINGS_MODULE=expert_system.production_settings python manage.py createsuperuser
```

6. Collect static files:

```bash
DJANGO_SETTINGS_MODULE=expert_system.production_settings python manage.py collectstatic
```

## Step 3: Set Up Frontend

1. Navigate to the frontend directory:

```bash
cd ../frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.production` file:

```
VITE_API_URL=https://yourdomain.com/api
```

4. Build the frontend:

```bash
npm run build
```

## Step 4: Configure Web Server (Nginx)

1. Install Nginx:

```bash
sudo apt update
sudo apt install nginx
```

2. Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/experta
```

3. Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Frontend static files
    location / {
        root /path/to/ExpertA/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Media files
    location /media/ {
        alias /path/to/ExpertA/backend/media/;
    }
    
    # Static files
    location /static/ {
        alias /path/to/ExpertA/backend/staticfiles/;
    }
    
    # Additional security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

4. Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/experta /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 5: Set Up Gunicorn Service

1. Create a systemd service file:

```bash
sudo nano /etc/systemd/system/experta.service
```

2. Add the following configuration:

```ini
[Unit]
Description=ExpertA Gunicorn Daemon
After=network.target

[Service]
User=yourusername
Group=www-data
WorkingDirectory=/path/to/ExpertA/backend
ExecStart=/path/to/ExpertA/backend/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          --env DJANGO_SETTINGS_MODULE=expert_system.production_settings \
          expert_system.wsgi:application

[Install]
WantedBy=multi-user.target
```

3. Start and enable the service:

```bash
sudo systemctl start experta
sudo systemctl enable experta
```

## Step 6: Set Up SSL with Let's Encrypt

1. Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

2. Obtain and install SSL certificates:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. Set up auto-renewal:

```bash
sudo systemctl status certbot.timer  # Verify the timer is active
```

## Step 7: Additional Security Measures

1. Set up a firewall:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

2. Secure PostgreSQL (if used):

```bash
sudo nano /etc/postgresql/12/main/pg_hba.conf
# Modify to only allow local connections
sudo systemctl restart postgresql
```

## Maintenance

### Updating the Application

1. Pull the latest changes:

```bash
cd /path/to/ExpertA
git pull
```

2. Update backend:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
DJANGO_SETTINGS_MODULE=expert_system.production_settings python manage.py migrate
DJANGO_SETTINGS_MODULE=expert_system.production_settings python manage.py collectstatic --noinput
sudo systemctl restart experta
```

3. Update frontend:

```bash
cd ../frontend
npm install
npm run build
```

### Monitoring

1. Check application logs:

```bash
sudo journalctl -u experta
tail -f /path/to/ExpertA/backend/logs/experta.log
```

2. Monitor Nginx logs:

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Troubleshooting

1. If the application is not responding:
   - Check if Gunicorn is running: `sudo systemctl status experta`
   - Check Nginx status: `sudo systemctl status nginx`
   - Check application logs for errors

2. If static files are not loading:
   - Verify that collectstatic was run
   - Check Nginx configuration paths

3. Database connection issues:
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check connection settings in the .env file 