from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from django.conf import settings
from openai import OpenAI
from .pinecone_utils import init_pinecone
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import uuid
import re
import bleach
from datetime import datetime
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.serializers import ModelSerializer
from .models import Expert
from .serializers import ExpertSerializer, ExpertProfileSerializer

Expert = get_user_model()

# Create your views here.

class TrainingRateThrottle(UserRateThrottle):
    rate = '20/day'
    scope = 'training'

class ChatRateThrottle(UserRateThrottle):
    rate = '100/hour'
    scope = 'user'

class TrainingView(APIView):
    """
    API endpoint for experts to input knowledge into the system.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [TrainingRateThrottle]
    
    def sanitize_input(self, text):
        """Sanitize input text"""
        # Remove any HTML
        text = bleach.clean(text, tags=[], strip=True)
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def validate_knowledge(self, knowledge):
        """Validate knowledge input"""
        if not knowledge:
            return False, "No knowledge provided"
        if len(knowledge) < 10:
            return False, "Knowledge too short (minimum 10 characters)"
        if len(knowledge) > 5000:
            return False, "Knowledge too long (maximum 5000 characters)"
        return True, None

    def post(self, request):
        try:
            # Get and sanitize the knowledge from request
            knowledge = self.sanitize_input(request.data.get('knowledge', ''))
            
            # Validate input
            is_valid, error_message = self.validate_knowledge(knowledge)
            if not is_valid:
                return Response({
                    "error": error_message
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Generate embedding for the knowledge
            try:
                embedding_response = client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=knowledge
                )
                embedding = embedding_response.data[0].embedding
            except Exception as e:
                return Response({
                    "error": "Failed to generate embedding",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Initialize Pinecone
            index = init_pinecone()
            if not index:
                return Response({
                    "error": "Failed to initialize vector database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Store the embedding in Pinecone with user information
            try:
                entry_id = str(uuid.uuid4())
                index.upsert(vectors=[{
                    'id': entry_id,
                    'values': embedding[:1024],  # Truncate to match Pinecone's dimension
                    'metadata': {
                        'text': knowledge,
                        'created_by': request.user.username,
                        'created_at': str(datetime.now()),
                        'expert_id': str(request.user.id)  # Add expert ID for additional filtering
                    }
                }])
            except Exception as e:
                return Response({
                    "error": "Failed to store knowledge",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "message": "Knowledge stored successfully",
                "knowledge": knowledge,
                "id": entry_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": "Internal server error",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatView(APIView):
    """
    API endpoint for users to interact with the AI expert system.
    """
    authentication_classes = []  # Allow anonymous access
    permission_classes = []  # Allow anonymous access
    throttle_classes = [ChatRateThrottle]

    def sanitize_input(self, text):
        """Sanitize input text"""
        text = bleach.clean(text, tags=[], strip=True)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def validate_question(self, question):
        """Validate question input"""
        if not question:
            return False, "No question provided"
        if len(question) < 5:
            return False, "Question too short (minimum 5 characters)"
        if len(question) > 1000:
            return False, "Question too long (maximum 1000 characters)"
        return True, None

    def post(self, request):
        try:
            # Get and sanitize the question from request
            question = self.sanitize_input(request.data.get('question', ''))
            print(f"Received question: {question}")
            
            # Validate input
            is_valid, error_message = self.validate_question(question)
            if not is_valid:
                return Response({
                    "error": error_message
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Generate embedding for the question
            try:
                embedding_response = client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=question
                )
                question_embedding = embedding_response.data[0].embedding[:1024]  # Truncate to match Pinecone's dimension
                print("Successfully generated embedding")
            except Exception as e:
                print(f"Error generating embedding: {str(e)}")
                return Response({
                    "error": "Failed to generate embedding",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Initialize Pinecone and query for similar knowledge
            index = init_pinecone()
            if not index:
                print("Failed to initialize Pinecone")
                return Response({
                    "error": "Failed to initialize vector database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Query Pinecone for relevant knowledge
            try:
                query_response = index.query(
                    vector=question_embedding,
                    top_k=3,
                    include_metadata=True
                )
                print(f"Pinecone query response: {query_response}")
                relevant_knowledge = [match.metadata['text'] for match in query_response.matches]
                print(f"Found {len(relevant_knowledge)} relevant knowledge entries")
                for i, knowledge in enumerate(relevant_knowledge):
                    print(f"Knowledge {i+1}: {knowledge[:100]}...")
            except Exception as e:
                print(f"Error querying Pinecone: {str(e)}")
                return Response({
                    "error": "Failed to query knowledge base",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if not relevant_knowledge:
                print("No relevant knowledge found")
                return Response({
                    "answer": "I don't have enough knowledge to answer this question."
                }, status=status.HTTP_200_OK)

            # Generate response using OpenAI
            try:
                system_prompt = "You are an AI expert system. Use the following knowledge to answer the question. If the knowledge provided doesn't help answer the question, say so."
                user_prompt = f"Knowledge: {' '.join(relevant_knowledge)}\n\nQuestion: {question}"
                print("Sending request to OpenAI")
                
                chat_response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print("Received response from OpenAI")
            except Exception as e:
                print(f"Error generating OpenAI response: {str(e)}")
                return Response({
                    "error": "Failed to generate response",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            response_content = chat_response.choices[0].message.content
            print(f"Final response: {response_content[:100]}...")
            return Response({
                "answer": response_content,
                "sources_count": len(relevant_knowledge)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return Response({
                "error": "Internal server error",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertFormView(LoginRequiredMixin, TemplateView):
    template_name = 'api/expert_form.html'
    login_url = '/admin/login/'

class KnowledgeManagementView(LoginRequiredMixin, TemplateView):
    template_name = 'api/knowledge_management.html'
    login_url = '/admin/login/'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Initialize Pinecone
        index = init_pinecone()
        if not index:
            context['error'] = "Failed to initialize vector database"
            return context

        # Fetch all vectors with their metadata
        try:
            # Use a query with a dummy vector to get all entries
            dummy_vector = [0] * 1024  # Create a zero vector of dimension 1024
            query_response = index.query(
                vector=dummy_vector,
                top_k=10000,  # Set a high number to get all entries
                include_metadata=True
            )
            
            # Extract and sort entries by creation date
            entries = []
            for match in query_response.matches:
                entries.append({
                    'id': match.id,
                    'text': match.metadata.get('text', ''),
                    'created_by': match.metadata.get('created_by', ''),
                    'created_at': match.metadata.get('created_at', '')
                })
            
            # Sort by creation date (newest first)
            entries.sort(key=lambda x: x['created_at'], reverse=True)
            context['entries'] = entries
            
        except Exception as e:
            context['error'] = f"Failed to fetch knowledge entries: {str(e)}"
        
        return context

class ChatInterfaceView(TemplateView):
    template_name = 'api/chat.html'

class KnowledgeEntryView(APIView):
    """
    API endpoint for managing individual knowledge entries.
    """
    permission_classes = [IsAuthenticated]

    def get_title_and_preview(self, text):
        """Extract title and preview from text"""
        # Split by newlines or sentences to get the first meaningful part as title
        lines = text.split('\n')
        first_line = lines[0].strip()
        
        # If first line is too long, try to get first sentence
        if len(first_line) > 100:
            sentences = text.split('.')
            first_line = sentences[0].strip()[:100] + '...'
        
        # Get preview from the rest of the text
        preview = text[len(first_line):].strip()
        if len(preview) > 200:
            preview = preview[:200] + '...'
            
        return first_line, preview

    def get(self, request):
        """Retrieve all knowledge entries for the current user"""
        try:
            # Initialize Pinecone
            index = init_pinecone()
            if not index:
                return Response({
                    "error": "Failed to initialize vector database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Fetch all vectors using a dummy query
            try:
                # Create a dummy vector of zeros
                dummy_vector = [0] * 1024
                query_response = index.query(
                    vector=dummy_vector,
                    top_k=10000,  # Set a high number to get all entries
                    include_metadata=True
                )
                
                entries = []
                for match in query_response.matches:
                    # Only include entries created by the current user
                    if match.metadata.get('created_by') == request.user.username:
                        full_text = match.metadata['text']
                        title, preview = self.get_title_and_preview(full_text)
                        entries.append({
                            'id': match.id,
                            'title': title,
                            'preview': preview,
                            'created_at': match.metadata['created_at'],
                            'creator': match.metadata.get('created_by', 'Unknown')
                        })
                
                # Sort by creation date (newest first)
                entries.sort(key=lambda x: x['created_at'], reverse=True)
                return Response(entries, status=status.HTTP_200_OK)
                
            except Exception as e:
                print(f"Error querying Pinecone: {str(e)}")
                return Response({
                    "error": "Failed to fetch knowledge entries",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({
                "error": "Internal server error",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, entry_id):
        try:
            # First verify that this entry belongs to the current user
            index = init_pinecone()
            if not index:
                return Response({
                    "error": "Failed to initialize vector database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Fetch the existing entry
            query_response = index.fetch([entry_id])
            if not query_response.vectors:
                return Response({
                    "error": "Entry not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if the entry belongs to the current user
            entry = query_response.vectors[entry_id]
            if entry.metadata.get('created_by') != request.user.username:
                return Response({
                    "error": "You don't have permission to modify this entry"
                }, status=status.HTTP_403_FORBIDDEN)

            # Get and sanitize the knowledge from request
            knowledge = request.data.get('knowledge', '')
            if not knowledge:
                return Response({
                    "error": "No knowledge provided"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Generate new embedding
            try:
                embedding_response = client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=knowledge
                )
                embedding = embedding_response.data[0].embedding[:1024]
            except Exception as e:
                return Response({
                    "error": "Failed to generate embedding",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Update the entry in Pinecone
            try:
                index.upsert(vectors=[{
                    'id': entry_id,
                    'values': embedding,
                    'metadata': {
                        'text': knowledge,
                        'created_by': request.user.username,
                        'created_at': str(datetime.now())
                    }
                }])
            except Exception as e:
                return Response({
                    "error": "Failed to update knowledge",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "message": "Knowledge updated successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": "Internal server error",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, entry_id):
        try:
            # First verify that this entry belongs to the current user
            index = init_pinecone()
            if not index:
                return Response({
                    "error": "Failed to initialize vector database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Fetch the existing entry
            query_response = index.fetch([entry_id])
            if not query_response.vectors:
                return Response({
                    "error": "Entry not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Check if the entry belongs to the current user
            entry = query_response.vectors[entry_id]
            if entry.metadata.get('created_by') != request.user.username:
                return Response({
                    "error": "You don't have permission to delete this entry"
                }, status=status.HTTP_403_FORBIDDEN)

            # Delete the entry from Pinecone
            try:
                index.delete(ids=[entry_id])
            except Exception as e:
                return Response({
                    "error": "Failed to delete knowledge",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "message": "Knowledge deleted successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": "Internal server error",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertRegistrationView(APIView):
    """
    API endpoint for expert registration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            name = request.data.get('name', '').strip()
            email = request.data.get('email', '').strip()
            password = request.data.get('password', '')

            # Validate input
            if not all([name, email, password]):
                return Response({
                    "error": "All fields are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if email already exists
            if Expert.objects.filter(email=email).exists():
                return Response({
                    "error": "Email already registered"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create new expert
            expert = Expert.objects.create_user(
                username=email,  # Use email as username
                email=email,
                password=password,
                first_name=name.split()[0],
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
            )

            # Generate tokens
            refresh = RefreshToken.for_user(expert)

            return Response({
                "message": "Registration successful",
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "expert": {
                    "id": expert.id,
                    "name": expert.get_full_name(),
                    "email": expert.email,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "error": "Registration failed",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertProfileView(APIView):
    """
    API endpoint for getting the current expert's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expert = request.user
        serializer = ExpertProfileSerializer(expert)
        return Response(serializer.data)

class ExpertProfileUpdateView(APIView):
    """
    API endpoint for updating expert profile information.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        expert = request.user
        print("Received data:", request.data)  # Debug print
        serializer = ExpertProfileSerializer(expert, data=request.data, partial=True)
        
        if serializer.is_valid():
            print("Valid data:", serializer.validated_data)  # Debug print
            serializer.save()
            return Response(serializer.data)
        print("Validation errors:", serializer.errors)  # Debug print
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExpertListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        Expert = get_user_model()
        # Remove the is_staff filter temporarily to see all users
        experts = Expert.objects.all()
        
        # Add debug print
        print(f"Found {experts.count()} users")
        for expert in experts:
            print(f"User: {expert.username}, Staff: {expert.is_staff}, Name: {expert.get_full_name()}")
        
        data = [{
            'id': str(expert.id),
            'name': expert.get_full_name() or expert.username,
            'email': expert.email,
            'specialties': getattr(expert, 'specialties', ''),
            'bio': getattr(expert, 'bio', '')
        } for expert in experts]
        
        return Response(data)

class ExpertDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, expert_id):
        Expert = get_user_model()
        try:
            expert = Expert.objects.get(id=expert_id)
            data = {
                'id': str(expert.id),
                'name': expert.get_full_name() or expert.username,
                'email': expert.email,
                'specialties': getattr(expert, 'specialties', ''),
                'bio': getattr(expert, 'bio', '')
            }
            return Response(data)
        except Expert.DoesNotExist:
            return Response({'error': 'Expert not found'}, status=404)
