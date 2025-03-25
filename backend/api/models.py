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
