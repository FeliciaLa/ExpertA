from django.db import models
from django.contrib.auth.models import AbstractUser, AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.utils.text import slugify
import os
import time
import uuid

# Create your models here.

class Expert(AbstractUser):
    """Custom user model for experts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True)
    specialties = models.TextField(blank=True)
    title = models.CharField(max_length=100, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    
    # Fields to track training progress
    total_training_messages = models.IntegerField(default=0)
    last_training_at = models.DateTimeField(null=True, blank=True)
    
    # Email verification fields
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    verification_token_created_at = models.DateTimeField(null=True, blank=True)
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # Email & password are required by default

    # Override groups and user_permissions with custom related_names
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='expert_set',
        related_query_name='expert',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='expert_set',
        related_query_name='expert',
    )

    class Meta:
        db_table = 'experts'
        verbose_name = 'Expert'
        verbose_name_plural = 'Experts'

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Set username to email if not provided
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

class ExpertProfile(models.Model):
    """Model to store expert profile information from onboarding"""
    expert = models.OneToOneField('User', on_delete=models.CASCADE, related_name='profile')
    industry = models.CharField(max_length=255)
    years_of_experience = models.IntegerField()
    key_skills = models.TextField()
    typical_problems = models.TextField()
    background = models.TextField()
    certifications = models.TextField(blank=True)
    methodologies = models.TextField(blank=True)
    tools_technologies = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expert_profiles'

    def __str__(self):
        return f"{self.expert.email}'s Profile"

class TrainingMessage(models.Model):
    """Stores messages from the training conversation"""
    expert = models.ForeignKey('User', on_delete=models.CASCADE, related_name='training_messages')
    role = models.CharField(max_length=10)  # 'ai' or 'expert'
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    context_depth = models.IntegerField(default=1)
    knowledge_area = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['created_at']

class ExpertKnowledgeBase(models.Model):
    """Stores processed knowledge from expert training conversations"""
    expert = models.OneToOneField('User', on_delete=models.CASCADE, related_name='knowledge_base')
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Structured knowledge storage
    knowledge_areas = models.JSONField(default=dict)  # Organized by topic/area
    context_vectors = models.JSONField(default=dict)  # For semantic search
    training_summary = models.TextField(blank=True)   # Overall summary of expertise
    
    class Meta:
        db_table = 'expert_knowledge_bases'

    def __str__(self):
        return f"Knowledge Base for {self.expert.email}"

class KnowledgeEntry(models.Model):
    """Individual knowledge entries extracted from training conversations"""
    knowledge_base = models.ForeignKey(ExpertKnowledgeBase, on_delete=models.CASCADE, related_name='entries')
    topic = models.CharField(max_length=100)
    content = models.TextField()
    source_message = models.ForeignKey(TrainingMessage, on_delete=models.SET_NULL, null=True)
    context_depth = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)
    confidence_score = models.FloatField(default=1.0)
    
    class Meta:
        ordering = ['-confidence_score', '-last_accessed']

    def __str__(self):
        return f"{self.topic}: {self.content[:50]}..."

class OnboardingQuestion(models.Model):
    """Model to store the core onboarding questions"""
    question_text = models.TextField()
    order = models.IntegerField(unique=True)
    category = models.CharField(max_length=50)  # e.g., 'background', 'skills', 'industry'
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'onboarding_questions'
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."

class OnboardingAnswer(models.Model):
    """Model to store expert's answers to onboarding questions"""
    expert = models.ForeignKey('User', on_delete=models.CASCADE, related_name='onboarding_answers')
    question = models.ForeignKey(OnboardingQuestion, on_delete=models.CASCADE)
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'onboarding_answers'
        unique_together = ['expert', 'question']
        ordering = ['question__order']

    def __str__(self):
        return f"Answer by {self.expert.email} to Q{self.question.order}"

class TrainingSession(models.Model):
    """Model to store training sessions"""
    expert = models.ForeignKey('User', on_delete=models.CASCADE, related_name='training_sessions')
    expertise = models.CharField(max_length=255)
    phase = models.CharField(max_length=20, choices=[('initial', 'Initial'), ('specific', 'Specific')])
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'training_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.expert.email} - {self.expertise} ({self.phase})"

class TrainingAnswer(models.Model):
    """Model to store answers to training questions"""
    session = models.ForeignKey(TrainingSession, on_delete=models.CASCADE, related_name='answers')
    question_id = models.CharField(max_length=100)
    question_text = models.TextField()
    answer = models.TextField()
    question_number = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'training_answers'
        ordering = ['question_number']

    def __str__(self):
        return f"Q{self.question_number}: {self.question_text[:50]}..."

def document_upload_path(instance, filename):
    """Determine upload path for expert documents"""
    # Get the file extension
    ext = filename.split('.')[-1]
    # Create a unique filename based on timestamp and original name
    new_filename = f"{instance.expert.id}_{int(time.time())}_{slugify(filename.split('.')[0])}.{ext}"
    # Return the upload path
    return f"documents/{instance.expert.id}/{new_filename}"

class Document(models.Model):
    """Model to store uploaded documents for AI training"""
    PROCESSING_STATUS = (
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    expert = models.ForeignKey('User', on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to=document_upload_path)
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # Size in bytes
    mime_type = models.CharField(max_length=100)
    upload_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=PROCESSING_STATUS, default='processing')
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'expert_documents'
        ordering = ['-upload_date']
    
    def __str__(self):
        return f"Document {self.filename} by {self.expert.email}"
    
    def delete(self, *args, **kwargs):
        """Delete the associated file when deleting the model instance"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        """
        Creates and saves a User with the given email, name and password.
        """
        if not email:
            raise ValueError('Users must have an email address')
        if not name:
            raise ValueError('Users must have a name')

        # Set default values for these fields
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)

        user = self.model(
            email=self.normalize_email(email),
            name=name,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, name, password=None, **extra_fields):
        """
        Creates and saves a superuser with the given email, name and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """
    Unified user model for authentication of all users (regular users and experts)
    """
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        EXPERT = 'expert', 'Expert'
        USER = 'user', 'User'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)  # New users inactive until verified
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # Role field to replace separate user/expert models
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    
    # Fields needed for experts
    bio = models.TextField(blank=True)
    specialties = models.TextField(blank=True)
    title = models.CharField(max_length=100, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    total_training_messages = models.IntegerField(default=0)
    last_training_at = models.DateTimeField(null=True, blank=True)
    
    # Email verification fields
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    verification_token_created_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email
        
    def is_expert_user(self):
        """Check if user has expert role"""
        return self.role == self.Role.EXPERT
        
    def is_regular_user(self):
        """Check if user has regular user role"""
        return self.role == self.Role.USER
        
    def is_admin_user(self):
        """Check if user has admin role"""
        return self.role == self.Role.ADMIN
