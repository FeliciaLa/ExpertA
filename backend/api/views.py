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
from .models import TrainingSession, TrainingAnswer, ExpertKnowledgeBase, User, ExpertProfile, ConsultationSession, ChatMessage  # ConsentRecord
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
import os
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from rest_framework.decorators import api_view, permission_classes
from django.utils.dateparse import parse_datetime
from django.http import HttpRequest
from django.db import models
from rest_framework.authentication import TokenAuthentication

logger = logging.getLogger(__name__)

Expert = get_user_model()

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def create_stripe_connect_url(request):
    """Create a Stripe Connect OAuth URL for expert onboarding"""
    if request.method == 'OPTIONS':
        response = JsonResponse({'message': 'CORS preflight OK'})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    try:
        data = json.loads(request.body)
        expert_id = data.get('expert_id')
        
        if not expert_id:
            response = JsonResponse({'error': 'Expert ID is required'}, status=400)
        else:
            # Create the OAuth URL
            connect_url = f"https://connect.stripe.com/oauth/authorize?response_type=code&client_id={os.getenv('STRIPE_CONNECT_CLIENT_ID')}&scope=read_write&state={expert_id}"
            response = JsonResponse({'connect_url': connect_url})
        
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    except Exception as e:
        response = JsonResponse({'error': str(e)}, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response

@csrf_exempt
def stripe_connect_callback(request):
    """Handle Stripe Connect OAuth callback"""
    try:
        code = request.GET.get('code')
        state = request.GET.get('state')  # This is our expert_id
        error = request.GET.get('error')
        
        if error:
            return JsonResponse({'error': f'Stripe Connect error: {error}'}, status=400)
        
        if not code or not state:
            return JsonResponse({'error': 'Missing authorization code or state'}, status=400)
        
        # Exchange the authorization code for an access token
        token_response = stripe.OAuth.token(
            grant_type='authorization_code',
            code=code,
        )
        
        stripe_account_id = token_response['stripe_user_id']
        
        # Update the expert profile with Stripe Connect information
        try:
            expert = ExpertProfile.objects.get(id=state)
            expert.stripe_account_id = stripe_account_id
            expert.stripe_connected = True
            
            # Check if the account has completed onboarding
            account = stripe.Account.retrieve(stripe_account_id)
            expert.stripe_details_submitted = account.details_submitted
            expert.stripe_payouts_enabled = account.payouts_enabled
            
            expert.save()
            
            # Redirect to the expert profile page with success
            return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/expert-profile?stripe_connected=true")
            
        except ExpertProfile.DoesNotExist:
            return JsonResponse({'error': 'Expert not found'}, status=404)
    
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def disconnect_stripe_account(request):
    """Disconnect a Stripe Connect account"""
    if request.method == 'OPTIONS':
        response = JsonResponse({'message': 'CORS preflight OK'})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    try:
        data = json.loads(request.body)
        expert_id = data.get('expert_id')
        
        if not expert_id:
            response = JsonResponse({'error': 'Expert ID is required'}, status=400)
        else:
            expert = ExpertProfile.objects.get(id=expert_id)
            
            if expert.stripe_account_id:
                # Deauthorize the account
                stripe.OAuth.deauthorize(
                    client_id=os.getenv('STRIPE_CONNECT_CLIENT_ID'),
                    stripe_user_id=expert.stripe_account_id
                )
            
            # Clear Stripe Connect fields
            expert.stripe_account_id = None
            expert.stripe_connected = False
            expert.stripe_details_submitted = False
            expert.stripe_payouts_enabled = False
            expert.save()
            
            response = JsonResponse({'success': True})
        
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
    
    except ExpertProfile.DoesNotExist:
        response = JsonResponse({'error': 'Expert not found'}, status=404)
        response["Access-Control-Allow-Origin"] = "*"
        return response
    except Exception as e:
        response = JsonResponse({'error': str(e)}, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response

@csrf_exempt
@require_http_methods(["GET"])
def get_stripe_account_status(request, expert_id):
    """Get the current Stripe Connect account status for an expert"""
    try:
        expert = ExpertProfile.objects.get(id=expert_id)
        
        status = {
            'stripe_connected': expert.stripe_connected,
            'stripe_details_submitted': expert.stripe_details_submitted,
            'stripe_payouts_enabled': expert.stripe_payouts_enabled,
            'stripe_account_id': expert.stripe_account_id
        }
        
        # If connected, get fresh status from Stripe
        if expert.stripe_account_id:
            try:
                account = stripe.Account.retrieve(expert.stripe_account_id)
                status['stripe_details_submitted'] = account.details_submitted
                status['stripe_payouts_enabled'] = account.payouts_enabled
                
                # Update our database with fresh info
                expert.stripe_details_submitted = account.details_submitted
                expert.stripe_payouts_enabled = account.payouts_enabled
                expert.save()
                
            except stripe.error.StripeError:
                # Account might have been deleted or deauthorized
                expert.stripe_connected = False
                expert.stripe_account_id = None
                expert.stripe_details_submitted = False
                expert.stripe_payouts_enabled = False
                expert.save()
                
                status = {
                    'stripe_connected': False,
                    'stripe_details_submitted': False,
                    'stripe_payouts_enabled': False,
                    'stripe_account_id': None
                }
        
        return JsonResponse(status)
    
    except ExpertProfile.DoesNotExist:
        return JsonResponse({'error': 'Expert not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

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

            # Get the expert - try multiple lookup methods
            expert = None
            try:
                # First try to find by email
                expert = User.objects.get(email=expert_id)
            except User.DoesNotExist:
                try:
                    # Then try to find by ID (if it's a UUID)
                    expert = User.objects.get(id=expert_id)
                except (User.DoesNotExist, ValueError):
                    try:
                        # Finally try to find by name
                        expert = User.objects.get(name=expert_id)
                    except User.DoesNotExist:
                        print(f"Expert not found: {expert_id}")
                        return Response({
                            "error": "Expert not found"
                        }, status=status.HTTP_404_NOT_FOUND)
            
            print(f"\n=== Processing chat request ===")
            print(f"Expert ID: {expert_id}")
            print(f"Expert email: {expert.email}")
            print(f"Expert name: {expert.name}")
            print(f"User authenticated: {user is not None}")

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
                use_rag = request.data.get('use_rag', True)  # Default to True for backward compatibility
                print(f"Using RAG: {use_rag}")
                chatbot = ExpertChatbot(expert, use_rag=use_rag)
                print("ExpertChatbot initialized successfully")
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
                # Use the get_response method for all experts
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

            # Track consultation session and save messages if user is authenticated
            session = None
            message_count = 0
            if user:
                try:
                    # Get the MOST RECENT active session for this user and expert
                    session = ConsultationSession.objects.filter(
                        user=user,
                        expert=expert,
                        status=ConsultationSession.Status.ACTIVE
                    ).order_by('-started_at').first()
                    
                    # If no active session exists, create a new one
                    created = False
                    if not session:
                        session = ConsultationSession.objects.create(
                            user=user,
                            expert=expert,
                            expert_name=expert.name or expert.email,
                            expert_industry=getattr(expert.profile, 'industry', '') if hasattr(expert, 'profile') else '',
                            expert_specialty=expert.specialties or '',
                            total_messages=0,
                            duration_minutes=0,
                            status=ConsultationSession.Status.ACTIVE
                        )
                        created = True
                    
                    # Check if this is an activation session and enforce 200 interaction limit
                    if session.expert_industry == "ACTIVATION" and session.total_messages >= 400:  # 200 interactions = 400 messages
                        interactions_used = session.total_messages // 2
                        return Response({
                            'error': f'This AI expert has reached its interaction limit ({interactions_used}/200 interactions used). Please contact {expert.name} directly for further assistance.',
                            'limit_reached': True,
                            'interactions_used': interactions_used,
                            'limit': 200,
                            'expert_contact': expert.email
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    print(f"🎯 Using session: {session.id} (created: {created}, messages: {session.total_messages})")
                    
                    # Save user message to database
                    user_message = ChatMessage.objects.create(
                        session=session,
                        role=ChatMessage.Role.USER,
                        content=question
                    )
                    print(f"Saved user message: {user_message.id}")
                    
                    # Save AI response to database
                    ai_message = ChatMessage.objects.create(
                        session=session,
                        role=ChatMessage.Role.ASSISTANT,
                        content=response
                    )
                    print(f"Saved AI response: {ai_message.id}")
                    
                    # Increment message count (user message + AI response = 2 messages)
                    session.total_messages += 2
                    session.save()
                    
                    # Get current message count for this session
                    message_count = session.total_messages
                    
                    print(f"\n=== Consultation Session Tracking ===")
                    print(f"Session ID: {session.id}")
                    print(f"Created: {created}")
                    print(f"Total Messages: {session.total_messages}")
                    print(f"Status: {session.status}")
                    print(f"Messages saved: User({user_message.id}), AI({ai_message.id})")
                    
                except Exception as e:
                    print(f"Error tracking consultation session: {str(e)}")
                    # Don't fail the entire request if session tracking fails
                    pass

            # Prepare response with message tracking
            response_data = {
                "answer": response,
                "expert_id": expert.id,
                "expert_name": expert.name or expert.email
            }
            
            # Add message count if user is authenticated (for payment logic)
            if user and session:
                response_data.update({
                    "session_id": str(session.id),
                    "message_count": message_count,
                    "total_messages": session.total_messages
                })
            
            return Response(response_data, status=status.HTTP_200_OK)

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
            
            # Validate and prepare monetization_enabled (convert string to boolean if needed)
            monetization_enabled = profile_data.get('monetization_enabled', False)
            if isinstance(monetization_enabled, str):
                monetization_enabled = monetization_enabled.lower() in ['true', '1', 'yes', 'on']
            elif monetization_enabled is None:
                monetization_enabled = False
            
            # Validate and prepare monetization_price
            monetization_price = profile_data.get('monetization_price', 5.00)
            try:
                monetization_price = float(monetization_price)
                if monetization_price < 0:
                    monetization_price = 5.00
            except (ValueError, TypeError):
                monetization_price = 5.00
            
            print(f"Prepared values: industry={industry}, years_of_experience={years_of_experience}, key_skills={key_skills}, monetization_enabled={monetization_enabled}, monetization_price={monetization_price}")
            
            # Create or update the expert profile
            try:
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
                        'monetization_enabled': monetization_enabled,
                        'monetization_price': monetization_price
                    }
                )
                print(f"Profile created/updated successfully: created={created}")
            except Exception as profile_error:
                print(f"Error creating/updating profile: {str(profile_error)}")
                raise profile_error
            
            # Update the expert's main fields (these exist in User model)
            try:
                expert.name = profile_data.get('name', expert.name or '')
                expert.title = profile_data.get('title', expert.title or '')
                expert.bio = profile_data.get('bio', expert.bio or '')
                # expert.specialties = profile_data.get('expertise', expert.specialties or '')  # Map expertise to specialties
                print(f"Expert fields updated: name={expert.name}, title={expert.title}, bio length={len(expert.bio or '')}")
            except Exception as expert_fields_error:
                print(f"Error updating expert fields: {str(expert_fields_error)}")
                raise expert_fields_error
            
            # Mark onboarding as complete
            try:
                expert.onboarding_completed = True
                expert.onboarding_completed_at = timezone.now()
                expert.save()
                print(f"Expert onboarding marked as complete: {expert.onboarding_completed}")
            except Exception as save_error:
                print(f"Error saving expert: {str(save_error)}")
                raise save_error
            
            # Initialize knowledge base
            try:
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
            except Exception as kb_error:
                print(f"Error creating knowledge base: {str(kb_error)}")
                raise kb_error
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
            print(f"Using ExpertChatbot for {expert.email}")
            print(f"\n=== Response Debug ===")
            print(f"AI Response: {response}")
            
            # Track consultation session and save messages
            session = None
            message_count = 0
            
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
                
                # Save user message to database
                user_message = ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.USER,
                    content=message
                )
                print(f"Saved user message: {user_message.id}")
                
                # Save AI response to database
                ai_message = ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=response
                )
                print(f"Saved AI response: {ai_message.id}")
                
                # Increment message count (user message + AI response = 2 messages)
                session.total_messages += 2
                session.save()
                
                # Get current message count for this session
                message_count = session.total_messages
                
                print(f"\n=== Consultation Session Debug ===")
                print(f"Session ID: {session.id}")
                print(f"Created: {created}")
                print(f"Total Messages: {session.total_messages}")
                print(f"Status: {session.status}")
                print(f"Messages saved: User({user_message.id}), AI({ai_message.id})")
                
            except Exception as e:
                print(f"Error tracking consultation session: {str(e)}")
                # Don't fail the entire request if session tracking fails
                pass
            
            # Prepare response with message tracking
            response_data = {
                'expert_id': expert.id,
                'expert_name': expert.name or expert.email,
                'answer': response
            }
            
            # Add message count if session exists (for payment logic)
            if session:
                response_data.update({
                    'session_id': str(session.id),
                    'message_count': message_count,
                    'total_messages': session.total_messages
                })
            
            return Response(response_data)
            
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

@api_view(['POST', 'OPTIONS'])
def disconnect_stripe_account(request):
    """Disconnect expert's Stripe account"""
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        # Get the expert profile
        expert_profile = ExpertProfile.objects.get(user=request.user)
        
        # Clear Stripe connection
        expert_profile.stripe_account_id = ''
        expert_profile.stripe_connected = False
        expert_profile.stripe_details_submitted = False
        expert_profile.stripe_payouts_enabled = False
        expert_profile.save()
        
        return Response({'success': True})
        
    except ExpertProfile.DoesNotExist:
        return Response({'error': 'Expert profile not found'}, status=404)
    except Exception as e:
        print(f"Error disconnecting Stripe account: {str(e)}")
        return Response({'error': 'Failed to disconnect account'}, status=500)


@api_view(['GET'])
def get_stripe_connect_status(request, expert_id):
    """Get Stripe Connect status for an expert"""
    try:
        expert_profile = ExpertProfile.objects.get(expert_id=expert_id)
        return Response({
            'connected': expert_profile.stripe_connected,
            'details_submitted': expert_profile.stripe_details_submitted,
            'payouts_enabled': expert_profile.stripe_payouts_enabled
        })
    except ExpertProfile.DoesNotExist:
        return Response({'error': 'Expert not found'}, status=404)


# User Payment Processing Views
@api_view(['POST', 'OPTIONS'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """Create a Stripe Payment Intent for user consultation payment"""
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)
        
        # Check if this is an expert activation payment
        activation_payment = request.data.get('activation_payment', False)
        
        if activation_payment:
            # Expert activation payment - £9.99 to activate expert profile
            expert_id = request.data.get('expert_id')
            activation_amount = float(request.data.get('amount', 9.99))
            
            if not expert_id:
                return Response({'error': 'Expert ID is required'}, status=400)
            
            try:
                expert = User.objects.get(id=expert_id)
                # Verify the user is trying to activate their own expert profile
                if expert.id != request.user.id:
                    return Response({'error': 'You can only activate your own expert profile'}, status=403)
            except User.DoesNotExist:
                return Response({'error': 'Expert not found'}, status=404)
            
            total_amount = activation_amount  # £9.99 activation fee
            expert_amount = 0  # Platform keeps activation fee
            platform_amount = total_amount
            
        else:
            # Standard consultation payment logic
            expert_id = request.data.get('expert_id')
            if not expert_id:
                return Response({'error': 'Expert ID is required'}, status=400)
        
            # Get expert and pricing info
            try:
                expert = User.objects.get(id=expert_id)
            except User.DoesNotExist:
                return Response({'error': 'Expert not found'}, status=404)
        
            expert_profile, created = ExpertProfile.objects.get_or_create(
                expert_id=expert_id,
                defaults={'monetization_enabled': True}
            )
            
            # Ensure expert has monetization enabled
            if not expert_profile.monetization_enabled:
                expert_profile.monetization_enabled = True
                expert_profile.save()
            
            # Standard pricing
            expert_price = float(expert_profile.monetization_price or 5.00)
            
            # Direct payment to platform
            total_amount = expert_price * 1.2  # 20% platform fee
            expert_amount = 0  # Platform keeps all for now
            platform_amount = total_amount
        
        # Create simple Payment Intent without Stripe Connect
        print(f"Creating payment intent for £{total_amount} with user {request.user.id}")
        stripe_secret_key = os.getenv('STRIPE_SECRET_KEY')
        print(f"Stripe API key configured: {bool(stripe_secret_key)}")
        
        # Use requests library to call Stripe API directly
        import requests
        import base64
        
        try:
            # Create basic auth header for Stripe API calls
            auth_string = f"{stripe_secret_key}:"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Stripe-Version': '2024-06-20'
            }
            
            # Create or get Stripe customer for this user
            customer_id = None
            if request.user.stripe_customer_id:
                customer_id = request.user.stripe_customer_id
                print(f"Using existing Stripe customer: {customer_id}")
            else:
                # Create new Stripe customer
                customer_url = "https://api.stripe.com/v1/customers"
                customer_data = {
                    'email': request.user.email,
                    'name': request.user.name,
                    'metadata[user_id]': str(request.user.id)
                }
                
                customer_response = requests.post(customer_url, headers=headers, data=customer_data)
                if customer_response.status_code == 200:
                    customer_data = customer_response.json()
                    customer_id = customer_data['id']
                    
                    # Save customer ID to user
                    request.user.stripe_customer_id = customer_id
                    request.user.save()
                    print(f"✅ Created new Stripe customer: {customer_id}")
                else:
                    print(f"❌ Failed to create Stripe customer: {customer_response.text}")
            
            # Prepare payment intent with customer
            stripe_url = "https://api.stripe.com/v1/payment_intents"
            
            data = {
                'amount': int(total_amount * 100),  # Convert to pence
                'currency': 'gbp',
                'setup_future_usage': 'off_session',  # Save payment method for future use
                'metadata[expert_id]': expert_id,
                'metadata[expert_name]': expert.name,
                'metadata[user_id]': str(request.user.id),
                'metadata[total_amount]': str(total_amount),
                'metadata[session_type]': 'stoic_mentor_messages',
                'metadata[message_count]': '20'
            }
            
            # Add customer to payment intent if we have one
            if customer_id:
                data['customer'] = customer_id
                print(f"Adding customer {customer_id} to payment intent")
            
            print(f"Making direct Stripe API call to {stripe_url}")
            response = requests.post(stripe_url, headers=headers, data=data)
            
            print(f"Stripe API response status: {response.status_code}")
            print(f"Stripe API response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                intent_data = response.json()
                print(f"✅ Stripe PaymentIntent created successfully!")
                print(f"Intent ID: {intent_data.get('id')}")
                print(f"Client secret exists: {'client_secret' in intent_data}")
                
                if 'client_secret' in intent_data:
                    return Response({
                        'client_secret': intent_data['client_secret'],
                        'payment_intent_id': intent_data['id'],
                        'amount': total_amount,
                        'expert_amount': expert_amount,
                        'platform_amount': platform_amount
                    })
                else:
                    print(f"❌ No client_secret in response: {intent_data}")
                    return Response({'error': 'Payment intent missing client_secret'}, status=500)
            else:
                error_data = response.json() if response.content else {}
                print(f"❌ Stripe API error: {response.status_code} - {error_data}")
                return Response({'error': f'Stripe API error: {error_data.get("error", {}).get("message", "Unknown error")}'}, status=500)
                
        except requests.exceptions.RequestException as req_err:
            print(f"Request error: {req_err}")
            return Response({'error': f'Request error: {str(req_err)}'}, status=500)
        except Exception as e:
            print(f"General error: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return Response({'error': f'Error creating intent: {str(e)}'}, status=500)
        
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        return Response({'error': 'Failed to create payment intent'}, status=500)


@api_view(['POST', 'OPTIONS'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    """Confirm a completed payment and update user's message credits"""
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=401)
            
        payment_intent_id = request.data.get('payment_intent_id')
        expert_id = request.data.get('expert_id')
        activation_payment = request.data.get('activation_payment', False)
        
        if not payment_intent_id or not expert_id:
            return Response({'error': 'Payment intent ID and expert ID are required'}, status=400)
        
        # Verify the payment intent with Stripe using direct HTTP
        import requests
        import base64
        
        print(f"Verifying payment intent: {payment_intent_id}")
        
        stripe_secret_key = os.getenv('STRIPE_SECRET_KEY')
        stripe_url = f"https://api.stripe.com/v1/payment_intents/{payment_intent_id}"
        
        # Create basic auth header
        auth_string = f"{stripe_secret_key}:"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            'Authorization': f'Basic {auth_b64}',
            'Stripe-Version': '2024-06-20'
        }
        
        print(f"Making Stripe API call to verify payment: {stripe_url}")
        response = requests.get(stripe_url, headers=headers)
        
        print(f"Stripe verification response status: {response.status_code}")
        
        if response.status_code != 200:
            error_data = response.json() if response.content else {}
            print(f"Stripe verification failed: {error_data}")
            return Response({'error': 'Failed to verify payment with Stripe'}, status=400)
            
        payment_data = response.json()
        print(f"Payment verification successful. Status: {payment_data.get('status')}")
        
        # Check if payment was successful
        if payment_data.get('status') != 'succeeded':
            return Response({'error': f'Payment not completed. Status: {payment_data.get("status")}'}, status=400)
        
        # Get expert details
        try:
            expert = User.objects.get(id=expert_id)
        except User.DoesNotExist:
            return Response({'error': 'Expert not found'}, status=404)
        
        # Handle expert activation payments differently
        if activation_payment:
            # Verify the user is activating their own expert profile
            if expert.id != request.user.id:
                return Response({'error': 'You can only activate your own expert profile'}, status=403)
            
            # Create a special consultation session to track activation payment
            # This serves as both payment record and activation flag
            session = ConsultationSession.objects.create(
                user=request.user,
                expert=expert,
                expert_name=expert.name,
                expert_industry="ACTIVATION",  # Special marker for activation payments
                expert_specialty=f"ACTIVATION_PAYMENT_{payment_intent_id}",  # Store payment ID
                status=ConsultationSession.Status.ACTIVE,
                total_messages=0,  # Track usage against 200 limit
            )
            
            payment_amount = float(payment_data.get('amount', 0)) / 100  # Convert from pence to pounds
            print(f"✅ Expert activated: {expert.name} with payment £{payment_amount}")
            
            return Response({
                'success': True,
                'expert_activated': True,
                'expert_name': expert.name,
                'amount_paid': payment_amount,
                'interaction_limit': 200,
                'session_id': str(session.id)
            })
        
        # Original consultation payment logic below
        
        # Create a consultation session for the payment
        session = ConsultationSession.objects.create(
            user=request.user,
            expert=expert,
            expert_name=expert.name,
            expert_industry=getattr(expert, 'industry', ''),
            expert_specialty=getattr(expert, 'specialties', ''),
            status=ConsultationSession.Status.ACTIVE,
            total_messages=0,  # Will be incremented as messages are sent
        )
        
        # This represents a 15-minute consultation session
        session.duration_minutes = 15
        session.save()
        print(f"✅ Created paid session for {expert.name}: 15 minutes")
        
        # Store payment info in session metadata or create a separate payment record
        payment_amount = float(payment_data.get('amount', 0)) / 100  # Convert from pence to pounds
        print(f"✅ Payment recorded: £{payment_amount} for session {session.id}")
        
        print(f"✅ Payment confirmed and session created: {session.id}")
        
        return Response({
            'success': True,
            'session_id': str(session.id),
            'expert_name': expert.name,
            'message_credits': 0,
            'duration_minutes': 15,
            'amount_paid': payment_amount
        })
        
    except Exception as e:
        print(f"Error confirming payment: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        
        # Try to continue without using Stripe library at all
        return Response({
            'error': 'Payment confirmation failed',
            'details': str(e),
            'note': 'Payment may have succeeded but confirmation failed. Please contact support.'
        }, status=500)





class SavedPaymentMethodsView(APIView):
    """
    Endpoint for users to retrieve their saved payment methods
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            
            # Check if user has a Stripe customer ID
            if not user.stripe_customer_id:
                return Response({'payment_methods': []}, status=200)
            
            # Get saved payment methods from Stripe
            stripe_secret_key = os.getenv('STRIPE_SECRET_KEY')
            import requests
            import base64
            
            # Create auth header
            auth_string = f"{stripe_secret_key}:"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Stripe-Version': '2024-06-20'
            }
            
            # Get payment methods for customer
            pm_url = f"https://api.stripe.com/v1/payment_methods?customer={user.stripe_customer_id}&type=card"
            response = requests.get(pm_url, headers=headers)
            
            if response.status_code == 200:
                stripe_data = response.json()
                payment_methods = []
                
                for pm in stripe_data.get('data', []):
                    card = pm.get('card', {})
                    payment_methods.append({
                        'id': pm['id'],
                        'brand': card.get('brand', '').capitalize(),
                        'last4': card.get('last4', ''),
                        'exp_month': card.get('exp_month', ''),
                        'exp_year': card.get('exp_year', ''),
                        'created': pm.get('created', 0)
                    })
                
                return Response({'payment_methods': payment_methods}, status=200)
            else:
                print(f"Failed to get payment methods: {response.text}")
                return Response({'payment_methods': []}, status=200)
                
        except Exception as e:
            print(f"Error getting payment methods: {str(e)}")
            return Response({'error': 'Failed to retrieve payment methods'}, status=500)


class ChatHistoryView(APIView):
    """
    Endpoint for users to retrieve their chat history with experts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, expert_id=None):
        try:
            user = request.user
            
            # Get consultation sessions for this user
            if expert_id:
                # Get sessions with specific expert
                sessions = ConsultationSession.objects.filter(
                    user=user,
                    expert_id=expert_id
                ).order_by('-started_at')
            else:
                # Get all sessions for user
                sessions = ConsultationSession.objects.filter(
                    user=user
                ).order_by('-started_at')
            
            sessions_data = []
            for session in sessions:
                # Get messages for this session
                messages = ChatMessage.objects.filter(
                    session=session
                ).order_by('created_at')
                
                messages_data = []
                for message in messages:
                    messages_data.append({
                        'id': str(message.id),
                        'role': message.role,
                        'content': message.content,
                        'created_at': message.created_at.isoformat(),
                        'token_count': message.token_count,
                        'processing_time_ms': message.processing_time_ms
                    })
                
                sessions_data.append({
                    'session_id': str(session.id),
                    'expert_id': str(session.expert.id),
                    'expert_name': session.expert_name,
                    'expert_industry': session.expert_industry,
                    'expert_specialty': session.expert_specialty,
                    'started_at': session.started_at.isoformat(),
                    'ended_at': session.ended_at.isoformat() if session.ended_at else None,
                    'total_messages': session.total_messages,
                    'duration_minutes': session.duration_minutes,
                    'status': session.status,
                    'messages': messages_data
                })
            
            return Response({
                'sessions': sessions_data,
                'total_sessions': len(sessions_data)
            })
            
        except Exception as e:
            print(f"Error retrieving chat history: {str(e)}")
            return Response({
                'error': 'Failed to retrieve chat history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsentSubmissionView(APIView):
    """API view to handle consent submission for legal compliance"""
    permission_classes = [AllowAny]  # Allow anonymous users
    
    def get_client_ip(self, request):
        """Get the real IP address from request headers"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def post(self, request):
        """Submit consent record"""
        try:
            data = request.data
            
            # Validate required fields
            required_fields = [
                'terms_accepted', 'privacy_accepted', 'ai_disclaimer_accepted', 
                'age_confirmed', 'expert_name', 'timestamp'
            ]
            
            for field in required_fields:
                if field not in data:
                    return Response({
                        'error': f'Missing required field: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Parse timestamp
            try:
                timestamp = parse_datetime(data['timestamp'])
                if not timestamp:
                    return Response({
                        'error': 'Invalid timestamp format'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    'error': f'Invalid timestamp: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user if authenticated
            user = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
            
            # Get IP address
            ip_address = data.get('ip_address') or self.get_client_ip(request)
            
            # Create consent record - TEMPORARILY DISABLED
            # consent_record = ConsentRecord.objects.create(
            #     user=user,
            #     terms_accepted=bool(data['terms_accepted']),
            #     privacy_accepted=bool(data['privacy_accepted']),
            #     ai_disclaimer_accepted=bool(data['ai_disclaimer_accepted']),
            #     age_confirmed=bool(data['age_confirmed']),
            #     marketing_consent=bool(data.get('marketing_consent', False)),
            #     consent_version=data.get('consent_version', '1.0'),
            #     expert_name=data['expert_name'],
            #     timestamp=timestamp,
            #     ip_address=ip_address,
            #     user_agent=data.get('user_agent', request.META.get('HTTP_USER_AGENT', '')),
            #     referrer=data.get('referrer', ''),
            #     page_url=data.get('page_url', '')
            # )
            
            # logger.info(f"Consent recorded: {consent_record.id} for {ip_address} - {data['expert_name']}")
            logger.info(f"Consent received (temporarily not stored): {ip_address} - {data['expert_name']}")
            
            return Response({
                'success': True,
                'consent_id': 'temp_' + str(int(timestamp.timestamp())),
                'message': 'Consent recorded successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error recording consent: {str(e)}")
            return Response({
                'error': 'Failed to record consent'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsentCheckView(APIView):
    """API view to check if consent exists for a user/IP"""
    permission_classes = [AllowAny]
    
    def get_client_ip(self, request):
        """Get the real IP address from request headers"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get(self, request, identifier):
        """Check if consent exists for given identifier (IP or user ID)"""
        try:
            ip_address = self.get_client_ip(request)
            
            # Check by user if authenticated - TEMPORARILY DISABLED
            if hasattr(request, 'user') and request.user.is_authenticated:
                # consent_exists = ConsentRecord.objects.filter(
                #     user=request.user
                # ).exists()
                consent_exists = False  # Temporary
            else:
                # Check by IP address for anonymous users - TEMPORARILY DISABLED
                # consent_exists = ConsentRecord.objects.filter(
                #     ip_address=ip_address
                # ).exists()
                consent_exists = False  # Temporary
            
            return Response({
                'has_consent': consent_exists
            })
            
        except Exception as e:
            logger.error(f"Error checking consent: {str(e)}")
            return Response({
                'has_consent': False,
                'error': 'Failed to check consent'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
