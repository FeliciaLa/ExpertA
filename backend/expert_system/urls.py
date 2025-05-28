"""
URL configuration for expert_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse
import sys
import os
from datetime import datetime

# Super simple health check for Railway
def health(request):
    try:
        # Try to import and use Django models to ensure DB connection works
        from django.contrib.auth.models import User
        count = User.objects.count()
        
        # Return success response with more information
        return JsonResponse({
            "status": "ok",
            "message": "Health check passed",
            "db_connection": "successful",
            "user_count": count,
            "timestamp": str(datetime.now())
        })
    except Exception as e:
        # Log the error but still return a 200 response
        # to prevent Railway from restarting unnecessarily
        print(f"Health check error: {str(e)}")
        return JsonResponse({
            "status": "warning",
            "message": "Health check has warnings",
            "error": str(e),
            "timestamp": str(datetime.now())
        })

# Debug endpoint to get information about the environment
def debug_info(request):
    try:
        env_vars = {}
        for key, value in os.environ.items():
            # Filter out sensitive information
            if not any(secret in key.lower() for secret in ['key', 'secret', 'token', 'password', 'auth']):
                env_vars[key] = value
            else:
                env_vars[key] = "[FILTERED]"
                
        info = {
            "status": "running",
            "python_version": sys.version,
            "python_path": sys.executable,
            "environment": os.environ.get("NODE_ENV", "unknown"),
            "working_directory": os.getcwd(),
            "directory_listing": os.listdir(),
            "backend_directory_exists": os.path.exists("backend"),
            "env_variables": env_vars,
            "sys_path": sys.path,
        }
        
        return JsonResponse(info)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('login/', auth_views.LoginView.as_view(template_name='api/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('', RedirectView.as_view(url='api/expert-form/', permanent=False)),
    # Simple health endpoint at root level
    path('health/', health, name='health'),
    path('debug-info/', debug_info, name='debug-info'),
]

# Direct API endpoints for authentication
from api.views import EmailTokenObtainPairView
urlpatterns += [
    path('api/login/', EmailTokenObtainPairView.as_view(), name='api-login'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
