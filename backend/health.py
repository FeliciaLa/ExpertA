#!/usr/bin/env python
# Simple health check endpoint for Railway

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "healthy"}) 