import uuid
import datetime
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework.views import exception_handler
from rest_framework.response import Response
import jwt
from datetime import datetime, timedelta

# Add the custom exception handler
def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Now add CORS headers to the response
    if response is not None:
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    
    return response

def generate_verification_token():
    """Generate a unique verification token"""
    return str(uuid.uuid4())

def send_verification_email(user, request=None):
    """
    Send an email verification to the user or expert
    
    Parameters:
    - user: A User or Expert model instance
    - request: The HTTP request object
    
    Returns:
    - str: The verification token
    """
    # Generate a verification token
    token = generate_verification_token()
    
    # Save the token and timestamp to the user
    user.verification_token = token
    user.verification_token_created_at = timezone.now()
    user.save()
    
    # Get the frontend URL from settings or use default
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    
    # Create the verification URL
    verification_url = f"{frontend_url}/verify-email/{token}"
    
    # Get the user's name - compatible with both User and Expert models
    if hasattr(user, 'name'):
        # User model has a 'name' field
        name = user.name
    else:
        # Expert model uses get_full_name() from AbstractUser
        name = user.get_full_name() or user.username
    
    # Create the email content
    mail_subject = "Verify your email address"
    message = f"Hello {name},\n\nPlease click on the link below to verify your email address:\n\n{verification_url}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email."
    
    # Send the email
    send_mail(
        mail_subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    
    return token

def is_token_expired(created_at, expiry_hours=24):
    """Check if a token is expired (older than 24 hours)"""
    if not created_at:
        return True
    
    expiry_time = created_at + timedelta(hours=expiry_hours)
    return datetime.now() > expiry_time 