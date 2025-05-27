from django.conf import settings
import pinecone
from typing import Optional
import logging
import time

logger = logging.getLogger(__name__)

def init_pinecone(index_name: str = "expert-system") -> Optional[object]:
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
            # Initialize Pinecone client using the correct API version
            # For Pinecone v3.0.0 and above
            pc = pinecone.Pinecone(api_key=api_key)
            logger.info("Pinecone client created successfully")
        except Exception as e:
            # Fallback to older API version if the current fails
            try:
                logger.info("Trying alternative Pinecone initialization method...")
                pinecone.init(api_key=api_key)
                pc = pinecone
                logger.info("Pinecone client created successfully with legacy method")
            except Exception as e2:
                logger.error(f"Failed to create Pinecone client (both methods): {str(e)}, {str(e2)}")
                import traceback
                logger.error(f"Client creation traceback: {traceback.format_exc()}")
                return None
        
        # Check if index already exists
        try:
            # Try both API versions for listing indexes
            try:
                existing_indexes = pc.list_indexes()
                # Convert to list of names for V2 API
                if hasattr(existing_indexes[0], 'name') if existing_indexes else False:
                    existing_index_names = [index.name for index in existing_indexes]
                else:
                    # For older API that returns dict or list of strings
                    existing_index_names = existing_indexes
                logger.info(f"Successfully listed indexes: {existing_index_names}")
            except (AttributeError, TypeError):
                # For older API versions
                existing_index_names = pinecone.list_indexes()
                logger.info(f"Successfully listed indexes (legacy): {existing_index_names}")
            
        except Exception as e:
            logger.error(f"Error listing indexes: {str(e)}")
            import traceback
            logger.error(f"List indexes traceback: {traceback.format_exc()}")
            existing_index_names = []
        
        if not existing_index_names or index_name not in existing_index_names:
            logger.info(f"Creating new index: {index_name}")
            try:
                # Create index if it doesn't exist - try both API versions
                try:
                    pc.create_index(
                        name=index_name,
                        dimension=1024,  # Dimension for text embeddings
                        metric="cosine"
                    )
                except (AttributeError, TypeError):
                    # For older API versions
                    pinecone.create_index(
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
            # Try both API versions for getting the index
            try:
                index = pc.Index(index_name)
            except (AttributeError, TypeError):
                # For older API versions
                index = pinecone.Index(index_name)
            
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

def get_pinecone_index(index_name: str = "expert-system") -> Optional[object]:
    """
    Get an existing Pinecone index.
    Returns the index if it exists, None if it doesn't.
    """
    try:
        # Try both API versions
        try:
            pc = pinecone.Pinecone(api_key=settings.PINECONE_API_KEY)
            existing_indexes = pc.list_indexes()
            # Convert to list of names if needed
            if hasattr(existing_indexes[0], 'name') if existing_indexes else False:
                existing_index_names = [index.name for index in existing_indexes]
            else:
                existing_index_names = existing_indexes
                
            if index_name in existing_index_names:
                return pc.Index(index_name)
        except (AttributeError, TypeError):
            # For older API versions
            pinecone.init(api_key=settings.PINECONE_API_KEY)
            if index_name in pinecone.list_indexes():
                return pinecone.Index(index_name)
        return None
    except Exception as e:
        logger.error(f"Error getting Pinecone index: {str(e)}")
        return None 