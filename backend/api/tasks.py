"""
Django Q task functions for background processing (Database-backed!)
"""
from django_q.tasks import async_task, result
from django.utils import timezone
from .models import TrainingMessage, Document, User
from .services import KnowledgeProcessor
import logging

logger = logging.getLogger(__name__)

def process_training_message_async(message_id):
    """
    Process a training message for knowledge extraction in the background
    
    Args:
        message_id: ID of the TrainingMessage to process
    """
    try:
        # Get the training message
        message = TrainingMessage.objects.get(id=message_id)
        logger.info(f"Starting async knowledge processing for message {message_id}")
        
        # Only process expert messages
        if message.role != 'expert':
            logger.info(f"Skipping non-expert message {message_id}")
            return f"Skipped non-expert message {message_id}"
            
        # Get the expert
        expert = message.expert
        
        # Initialize knowledge processor
        processor = KnowledgeProcessor(expert)
        
        # Process the message
        processor.process_training_message(message)
        
        # Update the message to mark it as processed
        message.knowledge_processed = True
        message.knowledge_processed_at = timezone.now()
        message.save()
        
        logger.info(f"Successfully processed knowledge for message {message_id}")
        return f"Successfully processed knowledge for message {message_id}"
        
    except TrainingMessage.DoesNotExist:
        logger.error(f"Training message {message_id} not found")
        raise Exception(f"Training message {message_id} not found")
    except Exception as e:
        logger.error(f"Error processing knowledge for message {message_id}: {str(e)}")
        raise e

def process_expert_profile_async(expert_id):
    """
    Process an expert's profile for knowledge extraction in the background
    
    Args:
        expert_id: ID of the Expert to process
    """
    try:
        expert = User.objects.get(id=expert_id)
        logger.info(f"Starting async profile processing for expert {expert_id}")
        
        # Initialize knowledge processor
        processor = KnowledgeProcessor(expert)
        
        # Process the expert profile
        processor.process_expert_profile()
        
        logger.info(f"Successfully processed profile for expert {expert_id}")
        return f"Successfully processed profile for expert {expert_id}"
        
    except User.DoesNotExist:
        logger.error(f"Expert {expert_id} not found")
        raise Exception(f"Expert {expert_id} not found")
    except Exception as e:
        logger.error(f"Error processing profile for expert {expert_id}: {str(e)}")
        raise e

def process_document_async(document_id, content):
    """
    Process a document for knowledge extraction in the background
    
    Args:
        document_id: ID of the Document to process
        content: Extracted text content from the document
    """
    try:
        document = Document.objects.get(id=document_id)
        logger.info(f"Starting async document processing for document {document_id}")
        
        # Get the expert who owns this document
        expert = document.expert
        
        # Initialize knowledge processor
        processor = KnowledgeProcessor(expert)
        
        # Process the document
        processor.process_document(document_id, content)
        
        # Update the document to mark it as processed
        document.knowledge_processed = True
        document.knowledge_processed_at = timezone.now()
        document.save()
        
        logger.info(f"Successfully processed document {document_id}")
        return f"Successfully processed document {document_id}"
        
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        raise Exception(f"Document {document_id} not found")
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        raise e 