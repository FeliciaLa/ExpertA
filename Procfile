release: cd backend && python manage.py migrate --noinput
web: cd backend && gunicorn expert_system.wsgi --bind 0.0.0.0:$PORT
worker: cd backend && python manage.py rqworker knowledge_processing default 