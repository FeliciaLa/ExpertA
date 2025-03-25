from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """
        Initialize Pinecone when Django starts
        """
        from .pinecone_utils import init_pinecone
        init_pinecone()
