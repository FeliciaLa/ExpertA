"""
Production settings for expert_system project.
"""

from .settings import *
import os

# Security settings
DEBUG = False
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'duplixai.co.uk').split(',')

# HTTPS/SSL settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Database settings - uncomment to use PostgreSQL in production
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': os.getenv('DB_NAME', 'experta'),
#         'USER': os.getenv('DB_USER', 'experta_user'),
#         'PASSWORD': os.getenv('DB_PASSWORD', ''),
#         'HOST': os.getenv('DB_HOST', 'localhost'),
#         'PORT': os.getenv('DB_PORT', '5432'),
#     }
# }

# Static files configuration
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Media files configuration
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/experta.log'),
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Email settings for production (uncomment and configure for your SMTP server)
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.example.com')
# EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
# EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
# EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'your-email@example.com')
# EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
# DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'experta@example.com')

# CORS settings - update with your frontend domain
CORS_ALLOWED_ORIGINS = [
    'https://duplixai.co.uk',
    'https://www.duplixai.co.uk',
]

# CSRF settings
CSRF_TRUSTED_ORIGINS = [
    'https://duplixai.co.uk',
    'https://www.duplixai.co.uk',
]

# Frontend URL for links in emails etc.
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://duplixai.co.uk') 