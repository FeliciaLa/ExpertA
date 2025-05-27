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

# Health check view for Railway
def health_check(request):
    return JsonResponse({'status': 'ok'})

# Options method for health check (CORS preflight)
def health_check_options(request):
    response = HttpResponse()
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

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
    path('health/', health_check, name='health_check'),
    path('health-options/', health_check_options, name='health-check-options'),
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
