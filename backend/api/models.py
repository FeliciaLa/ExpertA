from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Expert(AbstractUser):
    """Custom user model for experts"""
    bio = models.TextField(blank=True)
    specialties = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

class TrainingSession(models.Model):
    """Model for expert AI training sessions"""
    expert = models.ForeignKey(Expert, on_delete=models.CASCADE, related_name='training_sessions')
    field_of_knowledge = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'training_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.expert.get_full_name()} - {self.field_of_knowledge}"

class TrainingQuestion(models.Model):
    """Model for questions and answers in a training session"""
    session = models.ForeignKey(TrainingSession, on_delete=models.CASCADE, related_name='questions')
    question = models.TextField()
    answer = models.TextField(blank=True, null=True)
    order = models.IntegerField()  # To maintain question sequence
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'training_questions'
        ordering = ['order']
        unique_together = ['session', 'order']  # Ensure unique order within a session

    def __str__(self):
        return f"Q{self.order}: {self.question[:50]}..."
