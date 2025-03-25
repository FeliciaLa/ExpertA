from django.conf import settings
from pinecone import Pinecone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def init_pinecone(index_name: str = "expert-system") -> Optional[Pinecone]:
    """
    Initialize Pinecone client and ensure index exists.
    Returns the index if successful, None if failed.
    """
    try:
        # Initialize Pinecone with API key
        logger.info("Initializing Pinecone...")
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        
        # Check if index already exists
        existing_indexes = pc.list_indexes()
        logger.info(f"Existing indexes: {existing_indexes}")
        
        if index_name not in [index.name for index in existing_indexes]:
            logger.info(f"Creating new index: {index_name}")
            # Create index if it doesn't exist
            pc.create_index(
                name=index_name,
                dimension=1024,  # Dimension for the free tier
                metric="cosine",
                spec={
                    "serverless": {
                        "cloud": "aws",
                        "region": "us-east-1"
                    }
                }
            )
        else:
            logger.info(f"Index {index_name} already exists")
        
        # Get the index
        index = pc.Index(index_name)
        logger.info("Pinecone initialization successful")
        return index
    
    except Exception as e:
        logger.error(f"Error initializing Pinecone: {str(e)}")
        return None

def get_pinecone_index(index_name: str = "expert-system") -> Optional[Pinecone]:
    """
    Get an existing Pinecone index.
    Returns the index if it exists, None if it doesn't.
    """
    try:
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        existing_indexes = pc.list_indexes()
        if index_name in [index.name for index in existing_indexes]:
            return pc.Index(index_name)
        return None
    except Exception as e:
        logger.error(f"Error getting Pinecone index: {str(e)}")
        return None 