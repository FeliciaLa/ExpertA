from django.conf import settings
from pinecone import Pinecone
from typing import Optional
import logging
import time

logger = logging.getLogger(__name__)

def init_pinecone(index_name: str = "expert-system") -> Optional[Pinecone]:
    """
    Initialize Pinecone client and ensure index exists.
    Returns the index if successful, None if failed.
    """
    try:
        # Initialize Pinecone with API key
        logger.info("Initializing Pinecone...")
        api_key = settings.PINECONE_API_KEY
        if not api_key:
            logger.error("No Pinecone API key found in settings")
            return None
            
        logger.info(f"Using API key: {'*' * (len(api_key) - 4) + api_key[-4:]}")
        
        try:
            # Initialize Pinecone client
            pc = Pinecone(api_key=api_key)
            logger.info("Pinecone client created successfully")
        except Exception as e:
            logger.error(f"Failed to create Pinecone client: {str(e)}")
            import traceback
            logger.error(f"Client creation traceback: {traceback.format_exc()}")
            return None
        
        # Check if index already exists
        try:
            existing_indexes = pc.list_indexes()
            logger.info(f"Successfully listed indexes: {existing_indexes}")
            
            # Convert to list of names for V2 API
            existing_index_names = [index.name for index in existing_indexes]
            logger.info(f"Existing index names: {existing_index_names}")
            
        except Exception as e:
            logger.error(f"Error listing indexes: {str(e)}")
            import traceback
            logger.error(f"List indexes traceback: {traceback.format_exc()}")
            existing_index_names = []
        
        if not existing_index_names or index_name not in existing_index_names:
            logger.info(f"Creating new index: {index_name}")
            try:
                # Create index if it doesn't exist
                pc.create_index(
                    name=index_name,
                    dimension=1024,  # Dimension for text embeddings
                    metric="cosine"
                )
                logger.info("Index created successfully")
                # Wait a moment for the index to be ready
                time.sleep(5)
            except Exception as e:
                logger.error(f"Error creating index: {str(e)}")
                import traceback
                logger.error(f"Create index traceback: {traceback.format_exc()}")
                if "already exists" in str(e).lower():
                    logger.info("Index already exists, proceeding to get it")
                else:
                    logger.error("Failed to create index and it doesn't exist")
                    return None
        else:
            logger.info(f"Index {index_name} already exists")
        
        # Get the index
        try:
            index = pc.Index(index_name)
            logger.info("Successfully got index")
            # Try a simple operation to verify the index works
            stats = index.describe_index_stats()
            logger.info(f"Index stats: {stats}")
            return index
        except Exception as e:
            logger.error(f"Error getting index: {str(e)}")
            import traceback
            logger.error(f"Get index traceback: {traceback.format_exc()}")
            return None
        
    except Exception as e:
        logger.error(f"Error initializing Pinecone: {str(e)}")
        import traceback
        logger.error(f"Initialization traceback: {traceback.format_exc()}")
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