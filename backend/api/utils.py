import uuid
import datetime
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

def generate_verification_token():
    """Generate a unique verification token"""
    return str(uuid.uuid4())

def send_verification_email(user, request):
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
    
    # Build the verification URL
    verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
    
    # Get the user's name - compatible with both User and Expert models
    if hasattr(user, 'name'):
        # User model has a 'name' field
        name = user.name
    else:
        # Expert model uses get_full_name() from AbstractUser
        name = user.get_full_name() or user.username
    
    subject = "Verify your ExpertA account"
    message = f"""
    Hello {name},
    
    Please verify your email by clicking on the link below:
    {verification_url}
    
    This link will expire in 24 hours.
    
    Thanks,
    ExpertA Team
    """
    
    # Send the email
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    
    return token

def is_token_expired(token_created_at):
    """Check if a token is expired (older than 24 hours)"""
    if not token_created_at:
        return True
    
    expiration_time = token_created_at + datetime.timedelta(hours=24)
    return timezone.now() > expiration_time 