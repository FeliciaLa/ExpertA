from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.core.files.uploadedfile import UploadedFile
import mimetypes
import os
import PyPDF2
import docx
import io

from .models import Document, Expert
from .services import KnowledgeProcessor

class DocumentListView(APIView):
    """
    List all documents uploaded by the expert
    """
    permission_classes = [IsAuthenticated]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request):
        expert = request.user
        documents = Document.objects.filter(expert=expert)
        
        result = []
        for doc in documents:
            result.append({
                'id': doc.id,
                'filename': doc.filename,
                'file_size': doc.file_size,
                'mime_type': doc.mime_type,
                'upload_date': doc.upload_date,
                'status': doc.status,
                'error_message': doc.error_message
            })
        
        response = Response({
            'documents': result,
            'total': len(result)
        })
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response


class DocumentUploadView(APIView):
    """
    Upload documents for AI training
    """
    permission_classes = [IsAuthenticated]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def post(self, request):
        expert = request.user
        files = request.FILES.getlist('documents')
        
        if not files:
            return Response({
                'error': 'No files provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_count = 0
        results = []
        
        for file in files:
            try:
                # Get file info
                filename = file.name
                file_size = file.size
                
                # Determine mime type
                mime_type, _ = mimetypes.guess_type(filename)
                if not mime_type:
                    mime_type = 'application/octet-stream'
                
                # Create document record
                document = Document.objects.create(
                    expert=expert,
                    file=file,
                    filename=filename,
                    file_size=file_size,
                    mime_type=mime_type
                )
                
                # Process document asynchronously (in a real app, this would be a background task)
                try:
                    self._process_document(document)
                    document.status = 'completed'
                    document.save()
                except Exception as e:
                    print(f"Error processing document: {str(e)}")
                    document.status = 'failed'
                    document.error_message = str(e)
                    document.save()
                
                results.append({
                    'id': document.id,
                    'filename': document.filename,
                    'status': document.status
                })
                
                uploaded_count += 1
                
            except Exception as e:
                print(f"Error uploading document: {str(e)}")
                results.append({
                    'filename': file.name if hasattr(file, 'name') else 'unknown',
                    'error': str(e)
                })
        
        response = Response({
            'message': f'Successfully uploaded {uploaded_count} documents',
            'uploaded_count': uploaded_count,
            'results': results
        })
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def _process_document(self, document):
        """Process document content and add to knowledge base"""
        content = ""
        
        try:
            # Extract text based on file type
            if document.mime_type == 'text/plain':
                # Process text files
                with open(document.file.path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            
            elif document.mime_type == 'application/pdf' or document.filename.lower().endswith('.pdf'):
                # Process PDF files
                content = self._extract_text_from_pdf(document.file.path)
            
            elif document.mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                                     'application/msword'] or document.filename.lower().endswith(('.docx', '.doc')):
                # Process Word documents
                content = self._extract_text_from_word(document.file.path)
            
            else:
                # For other file types, just note that we can't process them
                raise Exception(f"Unsupported file type: {document.mime_type}")
            
            # If we have content, process it
            if content.strip():
                # Process content and add to knowledge base
                knowledge_processor = KnowledgeProcessor(document.expert)
                knowledge_processor.process_document(document.id, content)
                print(f"Successfully processed document {document.id}: {document.filename}")
            else:
                raise Exception("No text content could be extracted from the document")
                
        except Exception as e:
            print(f"Error processing document {document.id}: {str(e)}")
            raise
    
    def _extract_text_from_pdf(self, file_path):
        """Extract text from a PDF file"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {str(e)}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def _extract_text_from_word(self, file_path):
        """Extract text from a Word document"""
        try:
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return '\n'.join(full_text)
        except Exception as e:
            print(f"Error extracting text from Word document: {str(e)}")
            raise Exception(f"Failed to extract text from Word document: {str(e)}")


class DocumentDeleteView(APIView):
    """
    Delete a document
    """
    permission_classes = [IsAuthenticated]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def delete(self, request, document_id):
        expert = request.user
        
        try:
            document = Document.objects.get(id=document_id, expert=expert)
        except Document.DoesNotExist:
            response = Response({
                'error': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
            # Add CORS headers to error response
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
        
        document.delete()
        
        response = Response({
            'message': 'Document deleted successfully'
        })
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response 