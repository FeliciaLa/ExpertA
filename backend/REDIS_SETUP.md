# Redis & Async Processing Setup Guide

## ✅ Step 2: Set up Redis

### For Local Development

#### Option A: Using Docker (Recommended)
```bash
# Pull and run Redis in Docker
docker run -d --name redis-server -p 6379:6379 redis:alpine

# Or using docker-compose (create docker-compose.yml):
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

#### Option B: Install Redis Directly

**On macOS:**
```bash
brew install redis
brew services start redis
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**On Windows:**
- Download from: https://github.com/microsoftarchive/redis/releases
- Or use WSL with Ubuntu instructions

### For Production Deployment

#### Railway
1. Add Redis service in Railway dashboard
2. Set environment variable: `REDIS_URL=redis://...` (Railway provides this)

#### Heroku
1. Add Redis addon: `heroku addons:create heroku-redis:hobby-dev`
2. The `REDIS_URL` environment variable is automatically set

#### Other Cloud Providers
Set these environment variables:
```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password  # if required
REDIS_DB=0
# OR
REDIS_URL=redis://user:password@host:port/db
```

## ✅ Step 3: Configure RQ Settings (COMPLETED)

The following has been configured in your `settings.py`:

### 1. Django RQ Added to INSTALLED_APPS ✅
```python
INSTALLED_APPS = [
    # ...
    "django_rq",  # Django RQ for async tasks
    # ...
]
```

### 2. RQ Queues Configuration ✅
```python
# Multiple queue configurations for different priorities
RQ_QUEUES = {
    'default': {...},
    'knowledge_processing': {...},  # For knowledge extraction
    'high': {...},                  # High priority tasks
    'low': {...}                   # Low priority tasks
}
```

### 3. Admin Interface Added ✅
- Access RQ admin at: `/django-rq/`
- Monitor jobs, queues, and workers

## 🧪 Testing Your Setup

### 1. Test Redis Connection
```bash
cd backend
python manage.py test_redis
```

### 2. Start RQ Worker
```bash
# Start worker for knowledge processing
python start_worker.py knowledge_processing

# Or use Django management command
python manage.py rqworker knowledge_processing
```

### 3. Test Async Knowledge Processing
```python
# In Django shell: python manage.py shell
import django_rq
from api.tasks import process_training_message_async

# Get queue
queue = django_rq.get_queue('knowledge_processing')

# Test job
job = queue.enqueue(lambda: print("Hello from async!"))
print(f"Job ID: {job.id}")
```

## 🚀 Running with Async Processing

### Development Setup
1. **Terminal 1** - Start Django server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Terminal 2** - Start Redis (if using Docker):
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Terminal 3** - Start RQ worker:
   ```bash
   cd backend
   python start_worker.py knowledge_processing
   ```

### Production Setup
1. **Deploy your app** with the updated code
2. **Add Redis service** to your hosting platform
3. **Start worker processes**:
   ```bash
   # On Railway/Heroku, add this as a worker process
   python manage.py rqworker knowledge_processing
   ```

## 📊 Monitoring

### RQ Admin Dashboard
- URL: `https://your-domain.com/django-rq/`
- View active jobs, failed jobs, workers
- Retry failed jobs manually

### Command Line Monitoring
```bash
# Check queue status
python manage.py rq info

# Monitor workers
python manage.py rq info --interval=1
```

## 🔧 Environment Variables

Add these to your `.env` or environment:

```bash
# For local Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# For cloud Redis (alternative to above)
REDIS_URL=redis://user:password@host:port/db
```

## ⚡ What's Now Async

With this setup, these operations now run in the background:

1. **Training Message Processing** (`process_training_message_async`)
   - Knowledge extraction from expert messages
   - Pinecone vector storage
   - Knowledge base updates

2. **Document Processing** (`process_document_async`)
   - PDF/Word text extraction
   - Knowledge chunking and embedding
   - Vector database storage

3. **Expert Profile Processing** (`process_expert_profile_async`)
   - Profile analysis and knowledge base creation

## 🎯 Benefits

- ✅ **Faster API responses** - No waiting for heavy AI processing
- ✅ **Better user experience** - Immediate feedback, processing in background
- ✅ **Scalability** - Multiple workers can process jobs in parallel
- ✅ **Reliability** - Failed jobs can be retried automatically
- ✅ **Monitoring** - Full visibility into job processing

## 🚨 Troubleshooting

### Redis Connection Issues
```bash
# Test Redis manually
redis-cli ping
# Should return: PONG
```

### Worker Not Starting
```bash
# Check Redis is running
docker ps | grep redis

# Check Django can connect
python manage.py test_redis
```

### Jobs Not Processing
1. Ensure worker is running: `python start_worker.py knowledge_processing`
2. Check RQ admin: `/django-rq/`
3. Check logs for errors

Your async processing is now ready! 🎉 