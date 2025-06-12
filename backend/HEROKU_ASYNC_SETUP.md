# Heroku Async Processing Setup Guide

## 🚀 **Quick Setup for Heroku**

Your Django RQ configuration is already in place! Here's how to enable async processing on Heroku:

## Step 1: Add Heroku Redis

```bash
# Add Redis addon (choose your plan)
heroku addons:create heroku-redis:mini -a your-app-name
# or for more robust: heroku-redis:hobby-dev

# Verify it's added
heroku addons:info heroku-redis -a your-app-name

# Check Redis URL is set
heroku config:get REDIS_URL -a your-app-name
```

## Step 2: Scale Worker Dyno

```bash
# Scale up the worker process (this will cost money)
heroku ps:scale worker=1 -a your-app-name

# Check running processes
heroku ps -a your-app-name
```

## Step 3: Deploy Your Updated Code

```bash
# Your settings.py already supports Heroku Redis via REDIS_URL
git add .
git commit -m "Enable async knowledge processing"
git push heroku main
```

## ✅ **Your Current Configuration**

### Procfile (Already Configured!)
```
release: python manage.py migrate --noinput
web: gunicorn expert_system.wsgi --bind 0.0.0.0:$PORT
worker: python manage.py rqworker knowledge_processing default
```

### Requirements.txt (Already Has Redis!)
```
django-rq==2.10.2
rq==1.16.2
redis==5.2.1
```

### Settings.py (Already Configured!)
- ✅ Django RQ enabled
- ✅ REDIS_URL environment variable support
- ✅ Multiple queue configuration
- ✅ RQ admin interface at `/django-rq/`

## 📊 **Monitoring on Heroku**

### Check Worker Logs
```bash
# View worker logs
heroku logs --tail --dyno=worker -a your-app-name

# View all logs
heroku logs --tail -a your-app-name
```

### RQ Admin Dashboard
Visit: `https://your-app-name.herokuapp.com/django-rq/`

### Queue Status
```bash
# Connect to Heroku app and check queues
heroku run python manage.py shell -a your-app-name

# In Django shell:
import django_rq
queue = django_rq.get_queue('knowledge_processing')
print(f"Queue length: {len(queue)}")
```

## 💰 **Heroku Costs**

### Redis Addon Costs:
- **heroku-redis:mini** - $3/month (25MB)
- **heroku-redis:hobby-dev** - $15/month (1GB)

### Worker Dyno Costs:
- **hobby** - $7/month per worker dyno
- **standard-1x** - $25/month per worker dyno

## 🧪 **Test Async Processing**

### 1. Test Redis Connection
```bash
heroku run python manage.py test_redis -a your-app-name
```

### 2. Test Job Queuing
```bash
# In Heroku console
heroku run python manage.py shell -a your-app-name

# Test enqueuing a job
import django_rq
from api.tasks import process_training_message_async
queue = django_rq.get_queue('knowledge_processing')
job = queue.enqueue(lambda: print("Test job from Heroku!"))
print(f"Job ID: {job.id}")
```

## ⚡ **What Happens Now**

When users interact with your app:

1. **Training messages** → Queued for async knowledge processing
2. **Document uploads** → Queued for async text extraction and embedding
3. **Expert profiles** → Queued for async knowledge base creation

All heavy AI processing happens in the background worker, keeping your web responses fast!

## 🚨 **Troubleshooting**

### Worker Not Processing Jobs
```bash
# Check if worker is running
heroku ps -a your-app-name

# Restart worker
heroku ps:restart worker -a your-app-name

# Check worker logs
heroku logs --tail --dyno=worker -a your-app-name
```

### Redis Connection Issues
```bash
# Check Redis status
heroku addons:info heroku-redis -a your-app-name

# Test connection
heroku run python manage.py test_redis -a your-app-name
```

### Out of Memory/Timeout Issues
```bash
# Upgrade worker dyno type
heroku ps:type worker=standard-1x -a your-app-name

# Or increase timeout in settings.py
RQ_QUEUES = {
    'knowledge_processing': {
        'DEFAULT_TIMEOUT': 1200,  # 20 minutes
        # ...
    }
}
```

## 🎯 **Ready to Go!**

Your async setup is complete. Just run:

```bash
# 1. Add Redis
heroku addons:create heroku-redis:hobby-dev -a your-app-name

# 2. Scale worker
heroku ps:scale worker=1 -a your-app-name

# 3. Deploy
git push heroku main
```

Your knowledge processor will now work asynchronously on Heroku! 🚀 