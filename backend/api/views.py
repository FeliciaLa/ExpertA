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
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import TrainingSession, TrainingAnswer, ExpertKnowledgeBase, User, ExpertProfile
from .serializers import ExpertSerializer, ExpertProfileSerializer, UserSerializer, UserRegistrationSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
import logging
from .services import ExpertChatbot, KnowledgeProcessor
from rest_framework import generics
from .jwt_views import CustomTokenObtainPairSerializer
from .utils import send_verification_email, is_token_expired
from django.core.validators import ValidationError

logger = logging.getLogger(__name__)

Expert = get_user_model()

# Create your views here.

class TrainingRateThrottle(UserRateThrottle):
    rate = '1/second'  # Allow 1 request per second per user

class ChatRateThrottle(UserRateThrottle):
    rate = '100/hour'
    scope = 'user'

class TrainingView(APIView):
    """
    API endpoint for experts to input knowledge into the system.
    Uses a phased approach:
    1. Initial phase (first 25 questions): Broad questions about background, experience, methodology
    2. Specific phase: Detailed technical questions based on gathered knowledge
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [TrainingRateThrottle]
    
    def _create_openai_client(self):
        """Create OpenAI client with proper error handling"""
        try:
            # Clean import and explicit initialization
            from openai import OpenAI as OpenAIClient
            import httpx
            
            # Create httpx client explicitly to avoid proxy issues
            http_client = httpx.Client(
                timeout=30.0,
                trust_env=False  # Don't trust environment proxy settings
            )
            
            # Initialize with explicit http_client to avoid automatic client creation
            client = OpenAIClient(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
            return client
        except Exception as e:
            print(f"Failed to create OpenAI client in TrainingView: {str(e)}")
            raise e

    def handle_throttled_request(self, request, wait=None):
        """Custom handling of throttled requests"""
        if wait:
            return Response({
                'error': 'Please wait before submitting another answer',
                'wait_seconds': int(wait)
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        return Response({
            'error': 'Too many requests. Please slow down.',
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    def sanitize_input(self, text):
        """Sanitize input text"""
        text = bleach.clean(text, tags=[], strip=True)
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

    def get_initial_question(self, expertise, question_number):
        """Generate an initial background question based on the expertise field."""
        background_questions = [
            f"What is your educational background and how did it prepare you for working in {expertise}?",
            f"How many years of experience do you have in {expertise} and what roles have you held?",
            f"What are the fundamental principles or concepts that every {expertise} professional should understand?",
            f"What are the most important technical skills required in {expertise}?",
            f"What methodologies or frameworks do you use in your {expertise} work?",
            f"What tools and technologies are essential in {expertise}?",
            f"How do you stay updated with the latest trends and developments in {expertise}?",
            f"What are the biggest challenges you've faced in {expertise} and how did you overcome them?",
            f"How do you approach problem-solving in {expertise}?",
            f"What are the key metrics or KPIs you focus on in {expertise}?",
            f"How do you ensure quality in your {expertise} work?",
            f"What security considerations are important in {expertise}?",
            f"How do you handle scalability challenges in {expertise}?",
            f"What are the best practices you follow in {expertise}?",
            f"How do you approach testing and validation in {expertise}?",
            f"What role does documentation play in your {expertise} work?",
            f"How do you handle stakeholder communication in {expertise} projects?",
            f"What are the emerging trends you see in {expertise}?",
            f"How do you measure success in {expertise} projects?",
            f"What ethical considerations are important in {expertise}?",
            f"How do you handle data privacy and security in {expertise}?",
            f"What frameworks or standards do you follow in {expertise}?",
            f"How do you approach continuous improvement in {expertise}?",
            f"What are the most common pitfalls to avoid in {expertise}?",
            f"Where do you see the future of {expertise} heading?"
        ]
        
        # Adjust question_number to be 0-based index
        question_idx = question_number - 1
        if question_idx >= len(background_questions):
            return None
            
        return {
            'id': str(uuid.uuid4()),
            'text': background_questions[question_idx]
        }

    def generate_specific_question(self, expertise, previous_answers):
        """Generate a specific technical question based on expertise and previous answers."""
        # Construct context from previous answers
        context = "\n".join([f"Q{i+1}: {ans}" for i, ans in enumerate(previous_answers)])
        
        prompt = f"""Based on the expert's previous answers about {expertise}:

{context}

Generate a specific technical question that:
1. Directly relates to {expertise}
2. Builds on their previous answers
3. Explores technical depth
4. Avoids repeating topics already covered
5. Focuses on practical application

Question:"""

        try:
            response = self._create_openai_client().chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"You are an expert interviewer specializing in {expertise}. Generate specific technical questions based on the context provided."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            question_text = response.choices[0].message.content.strip()
            return {
                'id': str(uuid.uuid4()),
                'text': question_text
            }
        except Exception as e:
            print(f"Error generating question: {str(e)}")
            return {
                'id': str(uuid.uuid4()),
                'text': f"What specific technical challenges have you encountered in {expertise} that required innovative solutions?"
            }

    def post(self, request):
        # Check if this is a finish training request
        if 'session_id' in request.data:
            return self.finish_training(request)
            
        # Check if this is a start training request
        if 'expertise' in request.data and 'question_id' not in request.data:
            expertise = request.data['expertise'].strip()
            return self.start_training(request, expertise)
        
        # This is an answer submission
        required_fields = ['question_id', 'answer', 'question_number', 'previous_answers', 'expertise']
        if not all(field in request.data for field in required_fields):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return self.handle_answer(request)

    def start_training(self, request, expertise):
        """Start a new training session."""
        if not expertise:
            return Response(
                {'error': 'Expertise field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create a new training session
        session = TrainingSession.objects.create(
            expert=request.user,
            expertise=expertise,
            phase='initial'
        )

        # Get the first question
        first_question = self.get_initial_question(expertise, 1)
        if not first_question:
            session.delete()  # Clean up if question generation fails
            return Response(
                {'error': 'Failed to generate initial question'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'question': first_question,
            'phase': 'initial',
            'question_number': 1,
            'session_id': session.id
        })

    def handle_answer(self, request):
        """Handle answer submission and generate next question."""
        answer = request.data['answer'].strip()
        question_number = int(request.data['question_number'])
        previous_answers = request.data.get('previous_answers', [])
        expertise = request.data['expertise'].strip()
        question_id = request.data['question_id']
        session_id = request.data.get('session_id')

        if not answer:
            return Response(
                {'error': 'Answer cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create session
        try:
            if session_id:
                session = TrainingSession.objects.get(
                    id=session_id,
                    expert=request.user,
                    completed_at__isnull=True
                )
            else:
                session = TrainingSession.objects.get(
                    expert=request.user,
                    expertise=expertise,
                    completed_at__isnull=True
                )
        except TrainingSession.DoesNotExist:
            session = TrainingSession.objects.create(
                expert=request.user,
                expertise=expertise,
                phase='initial'
            )

        # Store the answer
        TrainingAnswer.objects.create(
            session=session,
            question_id=question_id,
            question_text=request.data.get('question_text', ''),
            answer=answer,
            question_number=question_number
        )

        # Get the next question
        next_question_number = question_number + 1
        if next_question_number <= 25:  # Still in initial phase
            next_question = self.get_initial_question(expertise, next_question_number)
            phase = 'initial'
        else:  # Move to specific phase
            next_question = self.generate_specific_question(expertise, previous_answers)
            phase = 'specific'
            session.phase = phase
            session.save()

        if not next_question:
            return Response(
                {'error': 'Failed to generate next question'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Return the next question with updated state
        return Response({
            'question': next_question,
            'phase': phase,
            'question_number': next_question_number,
            'session_id': session.id
        })

    def finish_training(self, request):
        """Mark the training session as completed."""
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = TrainingSession.objects.get(
                id=session_id,
                expert=request.user,
                completed_at__isnull=True
            )
            session.completed_at = timezone.now()
            session.save()
            return Response({'message': 'Training session completed'})
        except TrainingSession.DoesNotExist:
            return Response(
                {'error': 'No active training session found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request, session_id=None):
        """Get all training sessions for the current user or a specific session"""
        if session_id:
            try:
                session = TrainingSession.objects.get(id=session_id, expert=request.user)
                answers = session.answers.all()
                answers_data = [
                    {
                        'question_id': answer.question_id,
                        'question_text': answer.question_text,
                        'answer': answer.answer,
                        'question_number': answer.question_number,
                        'created_at': answer.created_at
                    } for answer in answers
                ]
                
                session_data = {
                    'id': session.id,
                    'expertise': session.expertise,
                    'phase': session.phase,
                    'created_at': session.created_at,
                    'completed_at': session.completed_at,
                    'answers': answers_data,
                    'is_completed': session.completed_at is not None
                }
                
                return Response(session_data, status=status.HTTP_200_OK)
            except TrainingSession.DoesNotExist:
                return Response(
                    {'error': 'Training session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get all sessions for the current user
            sessions = TrainingSession.objects.filter(expert=request.user).order_by('-created_at')
            sessions_data = []
            
            for session in sessions:
                # Get the number of answers for this session
                answer_count = session.answers.count()
                
                sessions_data.append({
                    'id': session.id,
                    'expertise': session.expertise,
                    'phase': session.phase,
                    'created_at': session.created_at,
                    'completed_at': session.completed_at,
                    'answers_count': answer_count,
                    'is_completed': session.completed_at is not None
                })
            
        # Always return 200 OK with sessions data (which may be an empty list)
        # This prevents 404 errors when a user has no sessions yet
            return Response(sessions_data, status=status.HTTP_200_OK)
            
    def delete(self, request, session_id=None):
        """Delete a training session"""
        if not session_id:
            return Response(
                {'error': 'Session ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = TrainingSession.objects.get(id=session_id, expert=request.user)
            session.delete()
            return Response(
                {'message': 'Training session deleted successfully'},
                status=status.HTTP_200_OK
            )
        except TrainingSession.DoesNotExist:
            return Response(
                {'error': 'Training session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to delete training session: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ChatView(APIView):
    """
    Main chat endpoint for interacting with the AI
    """
    authentication_classes = []  # Allow anonymous access
    permission_classes = []  # Allow anonymous access

    def post(self, request):
        try:
            # Get the expert ID from the request
            expert_id = request.data.get('expert_id')
            if not expert_id:
                return Response({
                    "error": "expert_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check for authentication (optional for tracking)
            user = None
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                try:
                    import jwt
                    from django.conf import settings
                    decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                    user_id = decoded_token.get('user_id')
                    if user_id:
                        try:
                            user = User.objects.get(id=user_id)
                            print(f"Authenticated user found: {user.email}")
                        except User.DoesNotExist:
                            print(f"User not found for ID: {user_id}")
                except (jwt.DecodeError, jwt.ExpiredSignatureError) as e:
                    print(f"Token validation failed: {str(e)}")

            # Get the expert
            try:
                expert = User.objects.get(id=expert_id)
                print(f"\n=== Processing chat request ===")
                print(f"Expert ID: {expert_id}")
                print(f"Expert email: {expert.email}")
                print(f"User authenticated: {user is not None}")
            except User.DoesNotExist:
                print(f"Expert not found: {expert_id}")
                return Response({
                    "error": "Expert not found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Get the question
            question = request.data.get('message', '').strip()
            if not question:
                return Response({
                    "error": "Message is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            print(f"Question: {question}")

            # Initialize chatbot and get response
            try:
                print("Initializing chatbot...")
                chatbot = ExpertChatbot(expert)
                print("Chatbot initialized successfully")
            except Exception as e:
                print(f"Failed to initialize chatbot: {str(e)}")
                import traceback
                print(f"Chatbot initialization traceback: {traceback.format_exc()}")
                return Response({
                    "error": "Failed to initialize chatbot",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            try:
                print("Generating response...")
                response = chatbot.get_response(question)
                print("Response generated successfully")
                print(f"Response preview: {response[:100]}...")
            except Exception as e:
                print(f"Failed to generate response: {str(e)}")
                import traceback
                print(f"Response generation traceback: {traceback.format_exc()}")
                return Response({
                    "error": "Failed to generate response",
                    "detail": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Track consultation session if user is authenticated
            if user:
                from .models import ConsultationSession
                from django.utils import timezone
                
                try:
                    # Get or create consultation session for this user and expert
                    session, created = ConsultationSession.objects.get_or_create(
                        user=user,
                        expert=expert,
                        status=ConsultationSession.Status.ACTIVE,
                        defaults={
                            'expert_name': expert.name or expert.email,
                            'expert_industry': getattr(expert.profile, 'industry', '') if hasattr(expert, 'profile') else '',
                            'expert_specialty': expert.specialties or '',
                            'total_messages': 0,
                            'duration_minutes': 0,
                        }
                    )
                    
                    # Increment message count (user message + AI response = 2 messages)
                    session.total_messages += 2
                    session.save()
                    
                    print(f"\n=== Consultation Session Tracking ===")
                    print(f"Session ID: {session.id}")
                    print(f"Created: {created}")
                    print(f"Total Messages: {session.total_messages}")
                    print(f"Status: {session.status}")
                    
                except Exception as e:
                    print(f"Error tracking consultation session: {str(e)}")
                    # Don't fail the entire request if session tracking fails
                    pass

            return Response({
                "answer": response,
                "expert_id": expert.id,
                "expert_name": expert.name or expert.email
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in chat: {str(e)}")
            import traceback
            print(f"Chat error traceback: {traceback.format_exc()}")
            return Response({
                "error": "Failed to process chat request",
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
            client = self._create_openai_client()
            
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
    authentication_classes = []  # No authentication required for registration

    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response

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
            if User.objects.filter(email=email).exists():
                return Response({
                    "error": "Email already registered"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate password length
            if len(password) < 8:
                return Response({
                    "error": "Password must be at least 8 characters long"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create new expert (inactive initially)
            expert = User.objects.create_user(
                email=email,
                name=name,
                password=password,
                role=User.Role.EXPERT,
                is_active=False  # Expert starts inactive until email is verified
            )

            # Send verification email
            token = send_verification_email(expert, request)

            return Response({
                "message": "Registration successful! Please check your email to verify your account.",
                "expert": {
                    "id": expert.id,
                    "name": expert.name,
                    "email": expert.email,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            print("Expert registration exception:", str(e))
            print(traceback.format_exc())
            return Response({
                "error": "Registration failed",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertProfileView(APIView):
    """
    API endpoint for retrieving expert profile information.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request):
        print(f"\n=== ExpertProfileView GET DEBUG START ===")
        expert = request.user
        print(f"Request user: {expert}")
        print(f"User ID: {getattr(expert, 'id', 'No ID')}")
        print(f"User email: {getattr(expert, 'email', 'No email')}")
        print(f"User is_authenticated: {expert.is_authenticated}")
        print(f"User is_active: {getattr(expert, 'is_active', 'No is_active')}")
        print(f"User role: {getattr(expert, 'role', 'No role')}")
        
        # Ensure profile exists before serializing
        try:
            profile = expert.profile
            print(f"✓ Profile exists: {profile}")
        except ExpertProfile.DoesNotExist:
            print("✗ Profile doesn't exist, creating new one...")
            profile = ExpertProfile.objects.create(
                expert=expert,
                industry='',
                years_of_experience=0,
                key_skills='',
                typical_problems='',
                background='',
                certifications='',
                methodologies='',
                tools_technologies='',
                monetization_enabled=False,
                monetization_price=5.00
            )
            print(f"✓ Created new profile: {profile}")
        
        serializer = ExpertProfileSerializer(expert)
        print(f"Serialized data: {serializer.data}")
        print(f"=== BACKEND UPDATE DEBUG END ===")
        response = Response(serializer.data)
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response

class ProfileImageUploadView(APIView):
    """
    API endpoint for uploading profile images.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def post(self, request):
        if 'profile_image' not in request.FILES:
            response = Response(
                {'error': 'No image provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            expert = request.user
            expert.profile_image = request.FILES['profile_image']
            expert.save()
            
            serializer = ExpertProfileSerializer(expert)
            response = Response(serializer.data)
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response

class ExpertProfileDeleteView(APIView):
    """
    API endpoint for deleting expert profile.
    """
    permission_classes = [IsAuthenticated]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def delete(self, request):
        try:
            expert = request.user
            expert_email = expert.email
            expert_id = expert.id
            
            print(f"Delete view - About to delete expert: {expert_email} (ID: {expert_id})")
            
            # Check if expert exists before deletion
            experts_before = User.objects.filter(email=expert_email).count()
            print(f"Delete view - Experts with email {expert_email} before deletion: {experts_before}")
            
            # Delete the expert and all related objects
            expert.delete()
            
            # Verify deletion
            experts_after = User.objects.filter(email=expert_email).count()
            print(f"Delete view - Experts with email {expert_email} after deletion: {experts_after}")
            
            if experts_after == 0:
                print(f"Delete view - Expert {expert_email} successfully deleted from database")
                message = f"Expert account {expert_email} has been permanently deleted. You can register again with the same email if needed."
            else:
                print(f"Delete view - WARNING: Expert {expert_email} still exists in database after deletion attempt")
                message = f"Profile deletion completed, but account may still exist. Please contact support if you experience login issues."
            
            response = Response({"message": message})
            response["Access-Control-Allow-Origin"] = "*"
            return response
                
        except Exception as e:
            print(f"Delete view - Error deleting expert: {str(e)}")
            import traceback
            print(f"Delete view - Traceback: {traceback.format_exc()}")
            
            response = Response({
                "error": f"Failed to delete expert profile: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            response["Access-Control-Allow-Origin"] = "*"
            return response

class ExpertOnboardingCompleteView(APIView):
    """
    API endpoint for completing expert onboarding with profile data directly.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            expert = request.user
            profile_data = request.data
            
            print(f"=== ONBOARDING COMPLETION DEBUG START ===")
            print(f"Expert: {expert.email}")
            print(f"Profile data received: {profile_data}")
            
            # Validate and prepare required fields with defaults
            industry = profile_data.get('industry', '').strip()
            if not industry:
                industry = 'General'
            
            background = profile_data.get('background', '').strip()
            if not background:
                # Use title or a generic default since expertise field doesn't exist in model
                title = profile_data.get('title', 'professional')
                background = f"Professional with experience in {title.lower()} and {industry.lower()}."
            
            key_skills = profile_data.get('key_skills', '').strip()
            if not key_skills:
                key_skills = 'Problem solving, Communication, Analysis'
            
            years_of_experience = profile_data.get('years_of_experience', 1)
            if isinstance(years_of_experience, str):
                try:
                    years_of_experience = int(years_of_experience)
                except ValueError:
                    years_of_experience = 1
            
            # Ensure minimum experience
            if years_of_experience < 1:
                years_of_experience = 1
            
            # Create or update the expert profile
            profile, created = ExpertProfile.objects.update_or_create(
                expert=expert,
                defaults={
                    'industry': industry,
                    'years_of_experience': years_of_experience,
                    'key_skills': key_skills,
                    'typical_problems': profile_data.get('typical_problems', ''),
                    'background': background,
                    'certifications': profile_data.get('certifications', ''),
                    'methodologies': profile_data.get('methodologies', ''),
                    'tools_technologies': profile_data.get('tools_technologies', ''),
                    'monetization_enabled': profile_data.get('monetization_enabled', False),
                    'monetization_price': profile_data.get('monetization_price', 5.00)
                }
            )
            
            # Update the expert's main fields (these exist in User model)
            expert.title = profile_data.get('title', expert.title or '')
            expert.bio = profile_data.get('bio', expert.bio or '')
            expert.specialties = profile_data.get('expertise', expert.specialties or '')  # Map expertise to specialties
            
            # Mark onboarding as complete
            expert.onboarding_completed = True
            expert.onboarding_completed_at = timezone.now()
            expert.save()
            print(f"Expert onboarding marked as complete: {expert.onboarding_completed}")
            
            # Initialize knowledge base
            knowledge_base, kb_created = ExpertKnowledgeBase.objects.get_or_create(
                expert=expert,
                defaults={
                    'knowledge_areas': {
                        industry: years_of_experience,
                        'Professional Experience': years_of_experience,
                    },
                    'training_summary': f"Expert in {industry} with {years_of_experience} years of experience. Skills: {key_skills}. Specialties: {expert.specialties or 'General consulting'}."
                }
            )
            print(f"Knowledge base created: {kb_created}")
            print(f"=== ONBOARDING COMPLETION DEBUG END ===")
            
            return Response({
                'status': 'success',
                'message': 'Onboarding completed successfully',
                'profile_created': created,
                'knowledge_base_created': kb_created
            })
            
        except Exception as e:
            print(f"Error completing onboarding: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': f'Failed to complete onboarding: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertListView(APIView):
    """
    API endpoint for listing experts.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required for listing experts
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request):
        try:
            experts = User.objects.filter(role=User.Role.EXPERT, is_active=True)
            # Manually serialize the data to avoid UUID conversion issues
            data = []
            for expert in experts:
                # Debug - print expert ID
                print(f"Expert ID (raw): {expert.id}")
                print(f"Expert ID (str): {str(expert.id)}")
                
                expert_data = {
                    'id': str(expert.id),  # Ensure ID is explicitly converted to string
                    'slug': expert.slug,
                    'name': expert.name or expert.email,
                    'email': expert.email,
                    'specialties': getattr(expert, 'specialties', ''),
                    'bio': getattr(expert, 'bio', ''),
                    'title': getattr(expert, 'title', ''),
                    'profile_image': expert.profile_image.url if hasattr(expert, 'profile_image') and expert.profile_image else None,
                }
                data.append(expert_data)
            
            response = Response(data)
            # Add CORS headers
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
        except Exception as e:
            import traceback
            print(f"Error in ExpertListView: {str(e)}")
            print(traceback.format_exc())
            response = Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response

class ExpertDetailView(APIView):
    """
    API endpoint for retrieving a single expert.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required for expert details
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request, pk):
        try:
            # Try to find expert by slug first, then by UUID
            try:
                # First try to find by slug
                expert = User.objects.get(slug=pk, role=User.Role.EXPERT, is_active=True)
            except User.DoesNotExist:
                # If not found by slug, try by UUID
                expert = User.objects.get(pk=pk, role=User.Role.EXPERT, is_active=True)
            
            serializer = ExpertSerializer(expert)
            response_data = serializer.data
            # Add slug to response for frontend URL generation
            response_data['slug'] = expert.slug
            
            response = Response(response_data)
            # Add CORS headers to response
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
        except User.DoesNotExist:  # Update exception type
            response = Response(
                {'error': 'Expert not found'},
                status=status.HTTP_404_NOT_FOUND
            )
            response["Access-Control-Allow-Origin"] = "*"
            return response

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        print("Received attrs:", attrs)  # Debug print
        email = attrs.get('email')
        if email:
            # Set username to email for authentication
            attrs['username'] = email
        return super().validate(attrs)

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            
            print(f"Login attempt for email: {email}")
            
            # Find user with this email
            user = User.objects.filter(email=email).first()
            if not user:
                print(f"User not found for email: {email}")
                return Response({
                    "error": "No account found with this email address. Please check your email or register a new account."
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check if user is active
            if not user.is_active:
                print(f"User {email} is inactive - likely not email verified")
                return Response({
                    "error": "Account not activated. Please check your email for verification instructions, or register again if needed."
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if not user.check_password(password):
                print(f"Invalid password for user: {email}")
                return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Create a token using the custom serializer that includes role
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims
            refresh['user_id'] = str(user.id)
            refresh['email'] = user.email
            refresh['name'] = user.name
            refresh['role'] = user.role
            
            # For backward compatibility
            refresh['is_expert'] = user.is_expert_user()
            refresh['is_user'] = user.is_regular_user()
            
            # Create the token strings
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Debug token payload
            import jwt
            from django.conf import settings
            decoded_access = jwt.decode(access_token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": False})
            print(f"USER LOGIN - Token payload: user_id={decoded_access.get('user_id')}, role={decoded_access.get('role')}, is_user={decoded_access.get('is_user')}, is_expert={decoded_access.get('is_expert')}")
            
            # Prepare user data for response - ALWAYS use the same format
            user_data = {
                'id': str(user.id),
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'is_expert': user.is_expert_user(),
                'is_user': user.is_regular_user()
            }
            
            # Add expert-specific fields if applicable
            if user.is_expert_user():
                user_data.update({
                    'bio': getattr(user, 'bio', ''),
                    'specialties': getattr(user, 'specialties', ''),
                    'title': getattr(user, 'title', ''),
                    'onboarding_completed': getattr(user, 'onboarding_completed', False)
                })
            
            # Prepare the response with a consistent structure
            response_data = {
                "tokens": {
                    "access": access_token,
                    "refresh": refresh_token
                },
                "user": user_data,
                "message": "Login successful"
            }
            
            print(f"Login successful for user: {email}, role: {user.role}")
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            import traceback
            print("User login error:", str(e))
            print(traceback.format_exc())
            return Response({"error": "Authentication failed"}, status=status.HTTP_401_UNAUTHORIZED)

class ExpertChatbotView(APIView):
    """
    Endpoint for users to chat with an expert's AI
    """
    permission_classes = [AllowAny]  # Allow any user, JWT token validation is done manually

    def post(self, request, expert_id):
        try:
            # Check authentication
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Validate the token
            token = auth_header.split(' ')[1]
            try:
                import jwt
                from django.conf import settings
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                user_id = decoded_token.get('user_id')
                if not user_id:
                    return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Get the user object
                user = User.objects.get(id=user_id)
                print(f"Authenticated user: {user.email} (ID: {user_id})")
            except jwt.DecodeError:
                return Response({"error": "Invalid token format"}, status=status.HTTP_401_UNAUTHORIZED)
            except jwt.ExpiredSignatureError:
                return Response({"error": "Token has expired"}, status=status.HTTP_401_UNAUTHORIZED)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Get the expert
            expert = User.objects.get(id=expert_id)  # Use User model instead of Expert
            print(f"\n=== Expert Data Debug ===")
            print(f"Expert ID: {expert.id}")
            print(f"Expert Email: {expert.email}")
            print(f"Expert Name: {expert.name or expert.email}")
            print(f"Expert Bio: {expert.bio}")
            print(f"Expert Specialties: {expert.specialties}")
            print(f"Onboarding Completed: {expert.onboarding_completed}")
            print(f"Onboarding Completed At: {expert.onboarding_completed_at}")
            print(f"Total Training Messages: {expert.total_training_messages}")
            
            # Get the expert's profile
            try:
                expert_profile = expert.profile
                print(f"\n=== Expert Profile Debug ===")
                print(f"Industry: {expert_profile.industry}")
                print(f"Years of Experience: {expert_profile.years_of_experience}")
                print(f"Key Skills: {expert_profile.key_skills}")
                print(f"Background: {expert_profile.background}")
                print(f"Methodologies: {expert_profile.methodologies}")
                print(f"Tools & Technologies: {expert_profile.tools_technologies}")
            except Exception as e:
                print(f"\nError getting expert profile: {str(e)}")
                return Response({
                    'error': 'Expert profile not found or incomplete'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get knowledge base
            try:
                knowledge_base = ExpertKnowledgeBase.objects.get(expert=expert)
                print(f"\n=== Knowledge Base Debug ===")
                print(f"Knowledge Areas: {knowledge_base.knowledge_areas}")
                print(f"Training Summary: {knowledge_base.training_summary}")
            except ExpertKnowledgeBase.DoesNotExist:
                print(f"\nNo knowledge base found for expert {expert.email}")
                return Response({
                    'error': 'This expert has not completed their training yet'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the message
            message = request.data.get('message', '').strip()
            print(f"\n=== Message Debug ===")
            print(f"User Message: {message}")
            
            # Initialize chatbot and get response
            chatbot = ExpertChatbot(expert)
            response = chatbot.get_response(message)
            print(f"\n=== Response Debug ===")
            print(f"AI Response: {response}")
            
            # Track consultation session
            from .models import ConsultationSession
            from django.utils import timezone
            
            try:
                # Get or create consultation session for this user and expert
                session, created = ConsultationSession.objects.get_or_create(
                    user=user,
                    expert=expert,
                    status=ConsultationSession.Status.ACTIVE,
                    defaults={
                        'expert_name': expert.name or expert.email,
                        'expert_industry': getattr(expert.profile, 'industry', '') if hasattr(expert, 'profile') else '',
                        'expert_specialty': expert.specialties or '',
                        'total_messages': 0,
                        'duration_minutes': 0,
                    }
                )
                
                # Increment message count (user message + AI response = 2 messages)
                session.total_messages += 2
                session.save()
                
                print(f"\n=== Consultation Session Debug ===")
                print(f"Session ID: {session.id}")
                print(f"Created: {created}")
                print(f"Total Messages: {session.total_messages}")
                print(f"Status: {session.status}")
                
            except Exception as e:
                print(f"Error tracking consultation session: {str(e)}")
                # Don't fail the entire request if session tracking fails
                pass
            
            return Response({
                'expert_id': expert.id,
                'expert_name': expert.name or expert.email,
                'answer': response
            })
            
        except User.DoesNotExist:
            return Response({
                'error': 'Expert not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error in expert chatbot: {str(e)}")
            return Response({
                'error': 'Failed to generate response'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicExpertDetailView(APIView):
    """
    Public endpoint for getting expert details
    """
    authentication_classes = []  # Allow anonymous access
    permission_classes = []  # Allow anonymous access

    def get(self, request, expert_id):
        try:
            expert = User.objects.get(id=expert_id)  # Use User model instead of Expert
            return Response({
                'id': expert.id,
                'name': expert.name or expert.email,
                'email': expert.email,
                'title': getattr(expert, 'title', ''),
                'specialties': expert.specialties,
                'bio': expert.bio,
                'profile_image': expert.profile_image.url if expert.profile_image else None,
                'profile': {
                    'industry': getattr(expert.profile, 'industry', None),
                    'years_of_experience': getattr(expert.profile, 'years_of_experience', None),
                    'key_skills': getattr(expert.profile, 'key_skills', None),
                    'typical_problems': getattr(expert.profile, 'typical_problems', None),
                    'methodologies': getattr(expert.profile, 'methodologies', None),
                    'tools_technologies': getattr(expert.profile, 'tools_technologies', None),
                } if hasattr(expert, 'profile') else None
            })
        except User.DoesNotExist:  # Update exception type
            return Response({
                'error': 'Expert not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error getting expert details: {str(e)}")
            return Response({
                'error': 'Failed to get expert details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserRegistrationView(APIView):
    """
    API endpoint for user registration.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            # Get data from request
            name = request.data.get('name')
            email = request.data.get('email')
            password = request.data.get('password')
            role = request.data.get('role', User.Role.USER)  # Default to regular user
            
            # Validate input
            if not all([name, email, password]):
                return Response(
                    {"error": "Name, email, and password are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if user already exists with this email
            if User.objects.filter(email=email).exists():
                return Response(
                    {"error": "This email is already registered"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate password length
            if len(password) < 8:
                return Response(
                    {"error": "Password must be at least 8 characters long"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create user (inactive initially)
            user = User.objects.create_user(
                email=email,
                name=name,
                password=password,
                role=role,
                is_active=False  # User starts inactive until email is verified
            )
            
            # Send verification email
            token = send_verification_email(user, request)
            
            response_data = {
                "user": UserSerializer(user).data,
                "message": "Registration successful! Please check your email to verify your account."
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            # Print exception for debugging
            import traceback
            print("Registration exception:", str(e))
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    """
    API endpoint for retrieving user profile information.
    """
    permission_classes = [AllowAny]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request, user_id=None):
        try:
            print("UserProfileView - Request headers:", dict(request.headers))
            
            # Direct access via user_id in URL
            if user_id:
                print(f"Direct access to user profile with ID: {user_id}")
                
                try:
                    # Try to find a user with this ID
                    user = User.objects.get(id=user_id)
                    print(f"Found user: {user.email}")
                    
                    # Return user profile data
                    print(f"DEBUG v2.0 - User object: {user}")
                    print(f"DEBUG v2.0 - User has date_joined attr: {hasattr(user, 'date_joined')}")
                    print(f"DEBUG v2.0 - User date_joined value: {getattr(user, 'date_joined', 'NOT_FOUND')}")
                    print(f"DEBUG v2.0 - About to add date_joined to response_data")
                    
                    # Get consultation data for the user
                    from .models import ConsultationSession
                    consultations = ConsultationSession.objects.filter(user=user)
                    
                    # Calculate consultation statistics
                    experts_consulted = consultations.values('expert_id').distinct().count()
                    total_consultations = consultations.count()
                    
                    # Calculate most used industry
                    most_used_industry = '-'
                    if consultations.exists():
                        industry_counts = {}
                        for consultation in consultations:
                            industry = consultation.expert_industry or 'Other'
                            industry_counts[industry] = industry_counts.get(industry, 0) + 1
                        
                        if industry_counts:
                            most_used_industry = max(industry_counts.items(), key=lambda x: x[1])[0]
                    
                    response_data = {
                        'id': str(user.id),
                        'email': user.email,
                        'name': user.name,
                        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                        'profile_image': user.profile_image.url if user.profile_image else None,
                        'consultations': {
                            'experts_consulted': experts_consulted,
                            'total_consultations': total_consultations,
                            'most_used_industry': most_used_industry,
                            'sessions': [{
                                'id': str(consultation.id),
                                'expert_id': str(consultation.expert_id),
                                'expert_name': consultation.expert_name,
                                'expert_industry': consultation.expert_industry,
                                'expert_specialty': consultation.expert_specialty,
                                'started_at': consultation.started_at.isoformat(),
                                'ended_at': consultation.ended_at.isoformat() if consultation.ended_at else None,
                                'total_messages': consultation.total_messages,
                                'duration_minutes': consultation.duration_minutes,
                                'status': consultation.status,
                            } for consultation in consultations.order_by('-started_at')]
                        }
                    }
                    print(f"DEBUG v2.0 - response_data with date_joined and consultations: {response_data}")
                    
                    # Check if user is an expert or regular user
                    if hasattr(user, 'role'):
                        response_data['role'] = user.role
                        response_data['is_expert'] = user.is_expert_user() if hasattr(user, 'is_expert_user') else False
                        response_data['is_user'] = user.is_regular_user() if hasattr(user, 'is_regular_user') else True
                    
                    # Add expert-specific fields if available
                    if hasattr(user, 'bio'):
                        response_data['bio'] = user.bio
                    if hasattr(user, 'specialties'):
                        response_data['specialties'] = user.specialties
                    if hasattr(user, 'title'):
                        response_data['title'] = user.title
                    if hasattr(user, 'onboarding_completed'):
                        response_data['onboarding_completed'] = user.onboarding_completed
                    
                    response = Response(response_data)
                    
                    # Add CORS headers to response
                    response["Access-Control-Allow-Origin"] = "*"
                    return response
                    
                except User.DoesNotExist:
                    print(f"User with ID {user_id} not found")
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Token-based access for current user
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({"error": "Invalid authorization header"}, status=status.HTTP_401_UNAUTHORIZED)
            
            token = auth_header.split(' ')[1]
            print(f"Extracted token: {token[:10]}...")
            
            # Verify token and extract user ID
            import jwt
            from django.conf import settings
            
            try:
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                print(f"Decoded token: {decoded_token}")
                
                user_id = decoded_token.get('user_id')
                if not user_id:
                    return Response({"error": "Invalid token - missing user ID"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Find user by ID
                user = User.objects.get(id=user_id)
                print(f"Found user via token: {user.email}")
                
                # Return user profile data
                print(f"DEBUG TOKEN - User object: {user}")
                print(f"DEBUG TOKEN - User has date_joined attr: {hasattr(user, 'date_joined')}")
                print(f"DEBUG TOKEN - User date_joined value: {getattr(user, 'date_joined', 'NOT_FOUND')}")
                
                # Get consultation data for the user
                from .models import ConsultationSession
                consultations = ConsultationSession.objects.filter(user=user)
                
                # Calculate consultation statistics
                experts_consulted = consultations.values('expert_id').distinct().count()
                total_consultations = consultations.count()
                
                # Calculate most used industry
                most_used_industry = '-'
                if consultations.exists():
                    industry_counts = {}
                    for consultation in consultations:
                        industry = consultation.expert_industry or 'Other'
                        industry_counts[industry] = industry_counts.get(industry, 0) + 1
                    
                    if industry_counts:
                        most_used_industry = max(industry_counts.items(), key=lambda x: x[1])[0]
                
                response_data = {
                    'id': str(user.id),
                    'email': user.email,
                    'name': user.name,
                    'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                    'profile_image': user.profile_image.url if user.profile_image else None,
                    'consultations': {
                        'experts_consulted': experts_consulted,
                        'total_consultations': total_consultations,
                        'most_used_industry': most_used_industry,
                        'sessions': [{
                            'id': str(consultation.id),
                            'expert_id': str(consultation.expert_id),
                            'expert_name': consultation.expert_name,
                            'expert_industry': consultation.expert_industry,
                            'expert_specialty': consultation.expert_specialty,
                            'started_at': consultation.started_at.isoformat(),
                            'ended_at': consultation.ended_at.isoformat() if consultation.ended_at else None,
                            'total_messages': consultation.total_messages,
                            'duration_minutes': consultation.duration_minutes,
                            'status': consultation.status,
                        } for consultation in consultations.order_by('-started_at')]
                    }
                }
                
                # Check if user is an expert or regular user
                if hasattr(user, 'role'):
                    response_data['role'] = user.role
                    response_data['is_expert'] = user.is_expert_user() if hasattr(user, 'is_expert_user') else False
                    response_data['is_user'] = user.is_regular_user() if hasattr(user, 'is_regular_user') else True
                
                # Add expert-specific fields if available
                if hasattr(user, 'bio'):
                    response_data['bio'] = user.bio
                if hasattr(user, 'specialties'):
                    response_data['specialties'] = user.specialties
                if hasattr(user, 'title'):
                    response_data['title'] = user.title
                if hasattr(user, 'onboarding_completed'):
                    response_data['onboarding_completed'] = user.onboarding_completed
                
                response = Response(response_data)
                
                # Add CORS headers to response
                response["Access-Control-Allow-Origin"] = "*"
                return response
                
            except jwt.DecodeError:
                return Response({"error": "Invalid token format"}, status=status.HTTP_401_UNAUTHORIZED)
            except jwt.ExpiredSignatureError:
                return Response({"error": "Token has expired"}, status=status.HTTP_401_UNAUTHORIZED)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            import traceback
            print(f"Error in UserProfileView: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileUpdateView(APIView):
    """
    API endpoint for updating user profile information.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Add multipart parser for file uploads
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "PUT, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get_permissions(self):
        # Override to allow direct access without authentication
        if 'user_id' in self.request.data:
            return []  # No permissions needed for direct access
        return [IsAuthenticated()]  # Default permission
    
    def put(self, request):
        try:
            print("UserProfileUpdateView - Request data:", request.data)
            print("UserProfileUpdateView - Request headers:", request.headers)
            
            # Check if direct access via user_id in request data
            if 'user_id' in request.data:
                # We're using direct access, skip token authentication
                user_id = request.data.get('user_id')
                print(f"Direct access to update user profile with ID: {user_id}")
                
                try:
                    user = User.objects.get(id=user_id)
                    print(f"Found user via direct access for update: {user.email} - {user.id} - role: {user.role}")
                except User.DoesNotExist:
                    print(f"User with ID {user_id} not found for direct update")
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # Token-based authentication
                auth_header = request.headers.get('Authorization', '')
                print(f"Update view - Authorization header: {auth_header[:15]}...")
                
                if not auth_header.startswith('Bearer '):
                    print("Update view - ERROR: No Bearer token in Authorization header")
                    return Response({"error": "Invalid authorization header format"}, status=status.HTTP_401_UNAUTHORIZED)
                
                token = auth_header.split(' ')[1]
                print(f"Update view - Extracted token: {token[:10]}...")
                
                # Verify token and extract user ID
                import jwt
                from django.conf import settings
                
                try:
                    decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                    print(f"Update view - Decoded token: {decoded_token}")
                    
                    user_id = decoded_token.get('user_id')
                    if not user_id:
                        print("Update view - ERROR: No user_id in token payload")
                        return Response({"error": "Invalid token - missing user ID"}, status=status.HTTP_401_UNAUTHORIZED)
                    
                    # Find user by ID
                    user = User.objects.get(id=user_id)
                    print(f"Update view - Found user: {user.email} - {user.id} - role: {user.role}")
                    
                except jwt.DecodeError as e:
                    print(f"Update view - JWT decode error: {str(e)}")
                    return Response({"error": "Invalid token format"}, status=status.HTTP_401_UNAUTHORIZED)
                except jwt.ExpiredSignatureError:
                    print("Update view - JWT token expired")
                    return Response({"error": "Token has expired"}, status=status.HTTP_401_UNAUTHORIZED)
                except User.DoesNotExist:
                    print(f"Update view - User with ID {user_id} not found")
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Process the update request
            data = request.data
            print(f"Update view - Received data: {data}")
            
            # Update name if provided
            if 'name' in data:
                user.name = data['name']
            
            # Update email if provided
            if 'email' in data:
                if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                    return Response(
                        {"error": "Email already in use"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.email = data['email']
            
            # Update password if provided
            if 'currentPassword' in data and 'newPassword' in data:
                if not user.check_password(data['currentPassword']):
                    return Response(
                        {"error": "Current password is incorrect"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.set_password(data['newPassword'])
            
            # Update bio if provided (for expert users)
            if 'bio' in data and user.is_expert_user():
                user.bio = data['bio']
                
            # Update specialties if provided (for expert users)
            if 'specialties' in data and user.is_expert_user():
                user.specialties = data['specialties']
                
            # Update title if provided (for expert users)
            if 'title' in data and user.is_expert_user():
                user.title = data['title']
            
            # Handle profile image upload for all users (not just experts)
            if 'profile_image' in request.FILES:
                print(f"Update view - Profile image upload detected for user {user.id}")
                user.profile_image = request.FILES['profile_image']
                print(f"Update view - Profile image uploaded: {user.profile_image}")
            
            user.save()
            print(f"Update view - User {user.id} updated successfully")
            
            # Return updated user data
            serializer = UserSerializer(user)
            response = Response(serializer.data)
            
            # Add CORS headers to response
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
                
        except Exception as e:
            import traceback
            print(f"Error in UserProfileUpdateView: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileDeleteView(APIView):
    """
    API endpoint for deleting user profile.
    """
    permission_classes = [AllowAny]  # Changed from IsAuthenticated to AllowAny
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def delete(self, request):
        try:
            print("UserProfileDeleteView - Request data:", request.data)
            print("UserProfileDeleteView - Request headers:", dict(request.headers))
            
            # Token-based authentication
            auth_header = request.headers.get('Authorization', '')
            print(f"Delete view - Authorization header: {auth_header[:20] if auth_header else 'None'}...")
            
            if not auth_header.startswith('Bearer '):
                print("Delete view - ERROR: No Bearer token in Authorization header")
                return Response({"error": "Invalid authorization header format"}, status=status.HTTP_401_UNAUTHORIZED)
            
            token = auth_header.split(' ')[1]
            print(f"Delete view - Extracted token: {token[:10]}...")
            
            # Verify token and extract user ID
            import jwt
            from django.conf import settings
            
            try:
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                print(f"Delete view - Decoded token: {decoded_token}")
                
                user_id = decoded_token.get('user_id')
                if not user_id:
                    print("Delete view - ERROR: No user_id in token payload")
                    return Response({"error": "Invalid token - missing user ID"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Find user by ID
                user = User.objects.get(id=user_id)
                print(f"Delete view - Found user: {user.email} - {user.id} - role: {user.role}")
                
            except jwt.DecodeError as e:
                print(f"Delete view - JWT decode error: {str(e)}")
                return Response({"error": "Invalid token format"}, status=status.HTTP_401_UNAUTHORIZED)
            except jwt.ExpiredSignatureError:
                print("Delete view - JWT token expired")
                return Response({"error": "Token has expired"}, status=status.HTTP_401_UNAUTHORIZED)
            except User.DoesNotExist:
                print(f"Delete view - User with ID {user_id} not found")
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Delete the user
            user_email = user.email
            user_id = user.id
            
            print(f"Delete view - About to delete user: {user_email} (ID: {user_id})")
            
            # Check if user exists before deletion
            users_before = User.objects.filter(email=user_email).count()
            print(f"Delete view - Users with email {user_email} before deletion: {users_before}")
            
            # Delete the user and all related objects
            user.delete()
            
            # Verify deletion
            users_after = User.objects.filter(email=user_email).count()
            print(f"Delete view - Users with email {user_email} after deletion: {users_after}")
            
            if users_after == 0:
                print(f"Delete view - User {user_email} successfully deleted from database")
                message = f"User account {user_email} has been permanently deleted. You can register again with the same email if needed."
            else:
                print(f"Delete view - WARNING: User {user_email} still exists in database after deletion attempt")
                message = f"Profile deletion completed, but account may still exist. Please contact support if you experience login issues."
            
            # Return success response
            response = Response({"message": message})
            
            # Add CORS headers to response
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
                
        except Exception as e:
            import traceback
            print(f"Error in UserProfileDeleteView: {str(e)}")
            print(traceback.format_exc())
            response = Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response

class PublicExpertListView(APIView):
    """
    Public API endpoint for listing all experts without authentication.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def get(self, request):
        try:
            # Query the User model for experts
            experts = User.objects.filter(role=User.Role.EXPERT, is_active=True)
            
            # Manually serialize the data to avoid UUID conversion issues
            data = []
            for expert in experts:
                # Debug - print expert ID
                print(f"Expert ID (raw): {expert.id}")
                print(f"Expert ID (str): {str(expert.id)}")
                
                expert_data = {
                    'id': str(expert.id),  # Ensure ID is explicitly converted to string
                    'slug': expert.slug,
                    'name': expert.name or expert.email,
                    'email': expert.email,
                    'specialties': getattr(expert, 'specialties', ''),
                    'bio': getattr(expert, 'bio', ''),
                    'title': getattr(expert, 'title', ''),
                    'profile_image': expert.profile_image.url if hasattr(expert, 'profile_image') and expert.profile_image else None,
                }
                data.append(expert_data)
            
            # Debug - print all serialized data
            for i, item in enumerate(data):
                print(f"Expert {i} serialized data - ID: {item['id']}, Name: {item['name']}")
                
            response = Response(data)
            # Add CORS headers to response
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response
        except Exception as e:
            # Print the error for debugging
            import traceback
            print("Error fetching experts:", str(e))
            print(traceback.format_exc())
            response = Response(
                {'error': 'Failed to fetch experts'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
            return response

class EmailVerificationView(APIView):
    """
    API endpoint for verifying user email.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, token):
        try:
            # Find user with this token
            user = User.objects.filter(verification_token=token).first()
            
            if not user:
                return Response(
                    {"error": "Invalid verification token"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Check if token is expired
            if is_token_expired(user.verification_token_created_at):
                # Generate new token and send new email
                send_verification_email(user, request)
                return Response(
                    {"error": "Verification token expired. A new verification email has been sent."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Activate user
            user.is_active = True
            user.verification_token = None
            user.verification_token_created_at = None
            user.save()
            
            # Generate tokens for auto-login
            refresh = RefreshToken.for_user(user)
            
            # Add custom claims
            refresh['user_id'] = str(user.id)
            refresh['email'] = user.email
            refresh['name'] = user.name
            refresh['role'] = user.role
            
            # For backward compatibility
            refresh['is_expert'] = user.is_expert_user()
            refresh['is_user'] = user.is_regular_user()
            
            # Determine user type for the response
            user_type = "user" if user.is_regular_user() else "expert"
            
            return Response({
                "message": "Email verified successfully",
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                },
                "user": UserSerializer(user).data,
                "user_type": user_type
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            import traceback
            print(f"Email verification error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": "Email verification failed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class PasswordResetRequestView(APIView):
    """
    API endpoint for requesting password reset.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            email = request.data.get('email', '').strip()
            
            if not email:
                return Response({
                    "error": "Email is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find user with this email
            user = User.objects.filter(email=email).first()
            
            # Always return success to prevent email enumeration
            # But only send email if user exists
            if user and user.is_active:
                # Generate password reset token
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Send password reset email
                from django.core.mail import send_mail
                from django.conf import settings
                
                # Use frontend URL for password reset
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://duplixai.co.uk')
                reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"
                
                subject = f"Password Reset for {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'Duplix AI'}"
                message = f"""
Hello {user.name},

You have requested a password reset for your account.

Please click the following link to reset your password:
{reset_url}

If you did not request this password reset, please ignore this email.

The link will expire in 24 hours.

Best regards,
The Duplix AI Team
                """
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                    print(f"Password reset email sent to {user.email}")
                except Exception as e:
                    print(f"Error sending password reset email: {e}")
                    return Response({
                        "error": "Failed to send password reset email"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                "message": "If an account with that email exists, we've sent password reset instructions."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Password reset request error: {e}")
            return Response({
                "error": "Failed to process password reset request"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordResetConfirmView(APIView):
    """
    API endpoint for confirming password reset with new password.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, uidb64, token):
        try:
            new_password = request.data.get('new_password', '')
            confirm_password = request.data.get('confirm_password', '')
            
            if not new_password or not confirm_password:
                return Response({
                    "error": "Both password fields are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if new_password != confirm_password:
                return Response({
                    "error": "Passwords do not match"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(new_password) < 8:
                return Response({
                    "error": "Password must be at least 8 characters long"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Decode the user ID
            from django.utils.http import urlsafe_base64_decode
            from django.utils.encoding import force_str
            from django.contrib.auth.tokens import default_token_generator
            
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response({
                    "error": "Invalid password reset link"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if token is valid
            if not default_token_generator.check_token(user, token):
                return Response({
                    "error": "Invalid or expired password reset link"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Reset the password
            user.set_password(new_password)
            user.save()
            
            return Response({
                "message": "Password has been reset successfully. You can now sign in with your new password."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Password reset confirm error: {e}")
            return Response({
                "error": "Failed to reset password"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpertProfileUpdateView(APIView):
    """
    API endpoint for updating expert profile information.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def options(self, request, *args, **kwargs):
        # Handle CORS preflight requests
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "PUT, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response
    
    def put(self, request):
        expert = request.user
        print(f"=== BACKEND UPDATE DEBUG START ===")
        print(f"Request data: {request.data}")
        
        # Extract valid fields from request data
        valid_data = {}
        for field in ['bio', 'specialties', 'title', 'name', 'expertise']:
            if field in request.data:
                if field == 'expertise':
                    # Map expertise to specialties
                    valid_data['specialties'] = request.data[field]
                else:
                    valid_data[field] = request.data[field]
        
        # Handle first_name and last_name by combining them into name (for backward compatibility)
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        
        # Only process first_name/last_name if no direct name was provided
        if 'name' not in valid_data and (first_name or last_name):
            # Combine first and last name
            name_parts = [first_name, last_name]
            combined_name = ' '.join(part for part in name_parts if part)
            if combined_name:
                valid_data['name'] = combined_name
        
        print(f"Valid data: {valid_data}")
        
        # Update expert instance
        for key, value in valid_data.items():
            setattr(expert, key, value)
            print(f"Set expert.{key} = {value}")
        
        expert.save()
        print(f"Expert saved successfully")
        
        # Handle profile fields if provided
        if 'profile' in request.data:
            profile_data = request.data['profile']
            print(f"Profile data received: {profile_data}")
            
            # Get or create the expert profile
            try:
                profile = expert.profile
                print(f"Found existing profile: {profile}")
            except ExpertProfile.DoesNotExist:
                print("Creating new profile...")
                profile = ExpertProfile.objects.create(
                    expert=expert,
                    industry='',
                    years_of_experience=0,
                    key_skills='',
                    typical_problems='',
                    background='',
                    certifications='',
                    methodologies='',
                    tools_technologies='',
                    monetization_enabled=False,
                    monetization_price=5.00
                )
            
            # Update profile fields
            profile_fields = [
                'industry', 'years_of_experience', 'key_skills', 'typical_problems',
                'background', 'certifications', 'methodologies', 'tools_technologies',
                'monetization_enabled', 'monetization_price'
            ]
            
            for field in profile_fields:
                if field in profile_data:
                    setattr(profile, field, profile_data[field])
                    print(f"Updated profile.{field} = {profile_data[field]}")
            
            profile.save()
            print(f"Profile saved successfully")
        else:
            print("No profile data in request")
        
        # Check what we're about to return
        print(f"Expert after save: name={expert.name}, bio={expert.bio}")
        try:
            profile_check = expert.profile
            print(f"Profile after save: industry={profile_check.industry}, years_of_experience={profile_check.years_of_experience}")
        except ExpertProfile.DoesNotExist:
            print("No profile found after save")
        
        # Return updated profile
        serializer = ExpertProfileSerializer(expert)
        print(f"Serialized data: {serializer.data}")
        print(f"=== BACKEND UPDATE DEBUG END ===")
        response = Response(serializer.data)
        
        # Add CORS headers to response
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Cache-Control, Pragma"
        return response

class ChangeEmailView(APIView):
    """
    API endpoint for changing user email address with proper verification.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            new_email = request.data.get('new_email', '').strip().lower()
            current_password = request.data.get('current_password', '')
            
            if not new_email:
                return Response({
                    "error": "New email address is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not current_password:
                return Response({
                    "error": "Current password is required to change email"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify current password for security
            if not request.user.check_password(current_password):
                return Response({
                    "error": "Current password is incorrect"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate email format
            from django.core.validators import validate_email
            try:
                validate_email(new_email)
            except ValidationError:
                return Response({
                    "error": "Please enter a valid email address"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email is already in use
            if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
                return Response({
                    "error": "This email address is already in use"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if it's the same as current email
            if request.user.email == new_email:
                return Response({
                    "error": "This is already your current email address"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate verification token
            import secrets
            verification_token = secrets.token_urlsafe(32)
            
            print(f"Email change request - User: {request.user.email}")
            print(f"Email change request - New email: {new_email}")
            print(f"Email change request - Generated token: {verification_token}")
            
            # Store pending email change (you could create a PendingEmailChange model)
            # For now, we'll use a simple approach with user fields
            request.user.pending_email = new_email
            request.user.email_change_token = verification_token
            request.user.email_change_token_created_at = timezone.now()
            request.user.save()
            
            print(f"Email change request - Token saved to user: {request.user.email}")
            print(f"Email change request - Pending email saved: {request.user.pending_email}")
            
            # Send verification email to new address
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://duplixai.co.uk')
                verification_url = f"{frontend_url}/verify-email-change/{verification_token}"
                
                subject = "Verify Your New Email Address - Duplix AI"
                message = f"""
Hello {request.user.name},

You recently requested to change your email address on Duplix AI.

Please click the link below to verify your new email address:
{verification_url}

If you did not request this change, please ignore this email or contact support.

This link will expire in 24 hours.

Best regards,
The Duplix AI Team
                """
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [new_email],
                    fail_silently=False,
                )
                
                # Also notify the current email about the change attempt
                current_email_subject = "Email Change Request - Duplix AI"
                current_email_message = f"""
Hello {request.user.name},

A request was made to change your email address from {request.user.email} to {new_email}.

If this was you, please check the new email address for a verification link.
If this was not you, please secure your account immediately.

Best regards,
The Duplix AI Team
                """
                
                send_mail(
                    current_email_subject,
                    current_email_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [request.user.email],
                    fail_silently=True,  # Don't fail if current email notification fails
                )
                
            except Exception as e:
                print(f"Error sending verification email: {e}")
                return Response({
                    "error": "Failed to send verification email. Please try again."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                "message": f"Verification email sent to {new_email}. Please check your email and click the verification link to complete the email change."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Change email error: {e}")
            return Response({
                "error": "Failed to process email change request"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyEmailChangeView(APIView):
    """
    API endpoint to verify email change using the token sent to the new email.
    """
    authentication_classes = []  # No authentication required, using token
    
    def post(self, request):
        try:
            token = request.data.get('token', '')
            print(f"Email verification request - Token received: {token}")
            
            if not token:
                print("Email verification error: No token provided")
                return Response({
                    "error": "Verification token is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Find user with this token
            try:
                user = User.objects.get(email_change_token=token)
                print(f"Email verification - Found user: {user.email}, pending_email: {user.pending_email}")
            except User.DoesNotExist:
                print(f"Email verification error: No user found with token: {token}")
                # Let's also check if any users have email change tokens
                users_with_tokens = User.objects.filter(email_change_token__isnull=False).values('email', 'email_change_token', 'pending_email')
                print(f"Users with email change tokens: {list(users_with_tokens)}")
                return Response({
                    "error": "Invalid or expired verification token"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if token is expired (24 hours)
            if not user.email_change_token_created_at:
                return Response({
                    "error": "Invalid verification token"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            token_age = timezone.now() - user.email_change_token_created_at
            if token_age.total_seconds() > 24 * 60 * 60:  # 24 hours
                # Clean up expired token
                user.pending_email = None
                user.email_change_token = None
                user.email_change_token_created_at = None
                user.save()
                
                return Response({
                    "error": "Verification token has expired. Please request a new email change."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if pending email is still valid
            if not user.pending_email:
                return Response({
                    "error": "No pending email change found"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the pending email is still available
            if User.objects.filter(email=user.pending_email).exclude(id=user.id).exists():
                return Response({
                    "error": "This email address is no longer available"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update the email
            old_email = user.email
            user.email = user.pending_email
            user.pending_email = None
            user.email_change_token = None
            user.email_change_token_created_at = None
            user.save()
            
            # Send confirmation email to the new email address
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                subject = "Email Successfully Changed - Duplix AI"
                message = f"""
Hello {user.name},

Your email address has been successfully changed from {old_email} to {user.email}.

If you did not make this change, please contact support immediately.

Best regards,
The Duplix AI Team
                """
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,
                )
                
            except Exception as e:
                print(f"Error sending confirmation email: {e}")
                # Don't fail the verification if email sending fails
            
            return Response({
                "message": "Email address successfully updated!",
                "new_email": user.email
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Email verification error: {e}")
            return Response({
                "error": "Failed to verify email change"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    """
    API endpoint for changing user password.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Both current and new passwords are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        
        # Check current password
        if not user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        if len(new_password) < 8:
            return Response({
                'error': 'New password must be at least 8 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Change password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        })


class ConsultationSessionView(APIView):
    """
    API endpoint for managing consultation sessions.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Mark a consultation session as completed"""
        try:
            # Check authentication
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Validate the token
            token = auth_header.split(' ')[1]
            try:
                import jwt
                from django.conf import settings
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"], options={"verify_signature": True})
                user_id = decoded_token.get('user_id')
                if not user_id:
                    return Response({"error": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)
                
                user = User.objects.get(id=user_id)
            except (jwt.DecodeError, jwt.ExpiredSignatureError, User.DoesNotExist):
                return Response({"error": "Invalid authentication"}, status=status.HTTP_401_UNAUTHORIZED)
            
            expert_id = request.data.get('expert_id')
            action = request.data.get('action', 'complete')
            
            if not expert_id:
                return Response({"error": "expert_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                expert = User.objects.get(id=expert_id)
            except User.DoesNotExist:
                return Response({"error": "Expert not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Find active session
            from .models import ConsultationSession
            try:
                session = ConsultationSession.objects.get(
                    user=user,
                    expert=expert,
                    status=ConsultationSession.Status.ACTIVE
                )
                
                if action == 'complete':
                    session.mark_completed()
                    print(f"Marked consultation session {session.id} as completed")
                    
                    return Response({
                        'message': 'Session marked as completed',
                        'session_id': str(session.id),
                        'duration_minutes': session.duration_minutes
                    })
                else:
                    return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
                    
            except ConsultationSession.DoesNotExist:
                return Response({"error": "No active session found"}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            print(f"Error in consultation session endpoint: {str(e)}")
            return Response({
                'error': 'Failed to manage consultation session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
