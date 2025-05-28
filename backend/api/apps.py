from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """
        Initialize Pinecone when Django starts - but don't fail if it doesn't work
        """
        try:
            from .pinecone_utils import init_pinecone
            init_pinecone()
            logger.info("Pinecone initialized successfully")
        except Exception as e:
            logger.warning(f"Pinecone initialization failed: {e}")
            # Don't fail the entire app if Pinecone fails
            pass
