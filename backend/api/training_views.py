from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import OnboardingQuestion, OnboardingAnswer, TrainingMessage, ExpertProfile, ExpertKnowledgeBase
from openai import OpenAI
from django.conf import settings
import json
from django.core.cache import cache
from rest_framework.exceptions import Throttled
import time
from .services import KnowledgeProcessor

class RateLimitMixin:
    """Mixin to add rate limiting to views"""
    def get_cache_key(self, request):
        return f"ratelimit_{request.user.id}_{self.__class__.__name__}"

    def check_rate_limit(self, request):
        cache_key = self.get_cache_key(request)
        # Get current count
        count = cache.get(cache_key, 0)
        
        if count >= 10:  # Max 10 requests per minute
            raise Throttled(wait=60)
        
        # Increment count
        cache.set(cache_key, count + 1, 60)  # Reset after 60 seconds

class OnboardingView(RateLimitMixin, APIView):
    """
    Handles the initial 10-question onboarding process for experts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get the next onboarding question or status"""
        self.check_rate_limit(request)
        expert = request.user
        print(f"Checking onboarding status for expert: {expert.email}")
        
        # If onboarding is completed, return that info
        if expert.onboarding_completed:
            print(f"Expert {expert.email} has completed onboarding")
            return Response({
                'status': 'completed',
                'completed_at': expert.onboarding_completed_at,
                'is_completed': True
            })

        # Get answered questions
        answered_questions = OnboardingAnswer.objects.filter(expert=expert).values_list('question_id', flat=True)
        total_questions = OnboardingQuestion.objects.filter(is_active=True).count()
        print(f"Expert {expert.email} has answered {len(answered_questions)} out of {total_questions} questions")
        print(f"Answered question IDs: {list(answered_questions)}")
        
        # Get next unanswered question
        next_question = OnboardingQuestion.objects.filter(
            is_active=True
        ).exclude(
            id__in=answered_questions
        ).order_by('order').first()

        if not next_question:
            # All questions answered, mark onboarding as complete
            print(f"No more questions for expert {expert.email}, marking as complete")
            expert.onboarding_completed = True
            expert.onboarding_completed_at = timezone.now()
            expert.save()
            return Response({
                'status': 'completed',
                'completed_at': expert.onboarding_completed_at,
                'is_completed': True
            })

        print(f"Next question for expert {expert.email}: {next_question.question_text}")
        return Response({
            'status': 'in_progress',
            'is_completed': False,
            'next_question': {
                'id': next_question.id,
                'text': next_question.question_text,
                'order': next_question.order,
                'category': next_question.category
            },
            'progress': {
                'completed_questions': len(answered_questions),
                'total_questions': total_questions
            }
        })

    def post(self, request):
        """Submit an answer to an onboarding question"""
        expert = request.user
        question_id = request.data.get('question_id')
        answer = request.data.get('answer', '').strip()

        if not question_id or not answer:
            return Response({
                'error': 'Question ID and answer are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = OnboardingQuestion.objects.get(id=question_id, is_active=True)
        except OnboardingQuestion.DoesNotExist:
            return Response({
                'error': 'Question not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Save or update the answer
        OnboardingAnswer.objects.update_or_create(
            expert=expert,
            question=question,
            defaults={'answer': answer}
        )

        # If this was the last question, create the expert profile
        answered_count = OnboardingAnswer.objects.filter(expert=expert).count()
        total_questions = OnboardingQuestion.objects.filter(is_active=True).count()

        if answered_count == total_questions:
            self._create_expert_profile(expert)
            expert.onboarding_completed = True
            expert.onboarding_completed_at = timezone.now()
            expert.save()

        return Response({
            'status': 'success',
            'progress': {
                'answered': answered_count,
                'total': total_questions
            }
        })

    def put(self, request):
        """Update an existing answer"""
        expert = request.user
        question_id = request.data.get('question_id')
        answer = request.data.get('answer', '').strip()

        if not question_id or not answer:
            return Response({
                'error': 'Question ID and answer are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = OnboardingQuestion.objects.get(id=question_id, is_active=True)
        except OnboardingQuestion.DoesNotExist:
            return Response({
                'error': 'Question not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Ensure the expert has already answered this question
        try:
            existing_answer = OnboardingAnswer.objects.get(
                expert=expert,
                question=question
            )
            existing_answer.answer = answer
            existing_answer.save()
        except OnboardingAnswer.DoesNotExist:
            # If not previously answered, create a new answer
            OnboardingAnswer.objects.create(
                expert=expert,
                question=question,
                answer=answer
            )
        
        # Update the expert profile with the new answer
        self._update_expert_profile(expert)
        
        return Response({
            'status': 'success',
            'message': 'Answer updated successfully'
        })

    def _create_expert_profile(self, expert):
        """Create or update expert profile from onboarding answers"""
        answers = OnboardingAnswer.objects.filter(expert=expert).select_related('question')
        profile_data = {
            'industry': '',
            'years_of_experience': 0,
            'key_skills': '',
            'typical_problems': '',
            'background': '',
            'certifications': '',
            'methodologies': '',
            'tools_technologies': ''
        }

        # Map answers to profile fields based on question categories
        for answer in answers:
            category = answer.question.category
            if category == 'industry':
                profile_data['industry'] = answer.answer
                print(f"Setting industry for {expert.email}: {answer.answer}")
            elif category == 'experience':
                try:
                    profile_data['years_of_experience'] = int(answer.answer)
                except ValueError:
                    profile_data['years_of_experience'] = 0
            elif category == 'skills':
                profile_data['key_skills'] = answer.answer
                print(f"Setting skills for {expert.email}: {answer.answer}")
            elif category == 'problems':
                profile_data['typical_problems'] = answer.answer
            elif category == 'background':
                profile_data['background'] = answer.answer
            elif category == 'certifications':
                profile_data['certifications'] = answer.answer
            elif category == 'methodologies':
                profile_data['methodologies'] = answer.answer
            elif category == 'tools':
                profile_data['tools_technologies'] = answer.answer

        # Create or update the profile
        profile, created = ExpertProfile.objects.update_or_create(
            expert=expert,
            defaults=profile_data
        )
        print(f"{'Created' if created else 'Updated'} profile for {expert.email}")
        print(f"Profile data: {profile_data}")

        # Sync data with Expert model
        # Don't auto-generate the bio anymore - leave it blank for expert to write
        expert.specialties = f"{profile_data['key_skills']}\n\nMethodologies: {profile_data['methodologies']}\nTools & Technologies: {profile_data['tools_technologies']}"
        expert.save()
        print(f"Updated Expert model with specialties for {expert.email}")

        # Initialize knowledge base with proper data
        knowledge_base, kb_created = ExpertKnowledgeBase.objects.get_or_create(
            expert=expert,
            defaults={
                'knowledge_areas': {
                    profile_data['industry']: 100,  # Primary industry
                    'Professional Experience': profile_data['years_of_experience'],
                },
                'training_summary': f"Expert in {profile_data['industry']} with {profile_data['years_of_experience']} years of experience. Skills: {profile_data['key_skills']}"
            }
        )
        print(f"{'Created' if kb_created else 'Updated'} knowledge base for {expert.email}")
        return profile

    def _update_expert_profile(self, expert):
        """Update expert profile from onboarding answers"""
        # Reuse the _create_expert_profile method to update the profile
        self._create_expert_profile(expert)

class TrainingChatView(RateLimitMixin, APIView):
    """
    Handles the ongoing AI-expert chat training after onboarding
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get chat history"""
        self.check_rate_limit(request)
        expert = request.user
        
        # Check if onboarding is completed
        if not expert.onboarding_completed:
            return Response({
                'error': 'Please complete onboarding first'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get chat history
        messages = TrainingMessage.objects.filter(expert=expert).order_by('created_at')
        
        return Response({
            'messages': [{
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at,
                'context_depth': msg.context_depth,
                'knowledge_area': msg.knowledge_area
            } for msg in messages]
        })

    def post(self, request):
        """Handle expert's message and generate AI response"""
        try:
            expert = request.user
            message = request.data.get('message', '').strip()

            if not message:
                return Response({
                    'error': 'Message is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get expert profile first
            profile = self._get_expert_profile_context(expert)
            if not profile:
                return Response({
                    'error': 'Expert profile not found. Please complete onboarding first.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Handle special commands
            is_command = message.upper() in ['START_TRAINING', 'SKIP_TOPIC']
            if is_command:
                # Don't save command messages
                history = self._get_conversation_history(expert)
                command_type = message.upper()
            else:
                # Save expert's message for normal conversation
                expert_msg = TrainingMessage.objects.create(
                    expert=expert,
                    role='expert',
                    content=message
                )
                
                try:
                    # Process expert's knowledge
                    knowledge_processor = KnowledgeProcessor(expert)
                    knowledge_processor.process_training_message(expert_msg)
                except Exception as e:
                    print(f"Warning: Failed to process expert knowledge: {str(e)}")
                    # Continue even if knowledge processing fails
                
                # Get conversation history
                history = self._get_conversation_history(expert)

            # Generate AI response
            ai_response = self._generate_ai_response(
                message=message if not is_command else None,
                history=history,
                profile=profile,
                is_initial=(command_type == 'START_TRAINING') if is_command else False,
                should_skip_topic=(command_type == 'SKIP_TOPIC') if is_command else False
            )
            print("Generated AI Response:", ai_response)
            
            # Save AI's response
            ai_msg = TrainingMessage.objects.create(
                expert=expert,
                role='ai',
                content=ai_response['content'],
                context_depth=ai_response.get('context_depth', 1),
                knowledge_area=ai_response.get('knowledge_area', '')
            )

            # Update expert's training stats (don't count commands)
            if not is_command:
                expert.total_training_messages += 2
                expert.last_training_at = timezone.now()
                expert.save()

            return Response({
                'message': {
                    'id': ai_msg.id,
                    'role': 'ai',
                    'content': ai_msg.content,
                    'created_at': ai_msg.created_at,
                    'context_depth': ai_msg.context_depth,
                    'knowledge_area': ai_msg.knowledge_area,
                    'conversation_state': ai_response.get('conversation_state', {})
                }
            })

        except Exception as e:
            print(f"Error in training chat: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'An error occurred while processing your message. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_conversation_history(self, expert):
        """Get recent conversation history"""
        messages = TrainingMessage.objects.filter(expert=expert).order_by('-created_at')[:10]
        return [{
            'role': msg.role,
            'content': msg.content,
            'context_depth': msg.context_depth,
            'knowledge_area': msg.knowledge_area
        } for msg in messages][::-1]  # Reverse to get chronological order

    def _get_expert_profile_context(self, expert):
        """Get expert's profile information for context"""
        try:
            profile = expert.profile
            context = {
                'industry': profile.industry,
                'years_of_experience': profile.years_of_experience,
                'key_skills': profile.key_skills,
                'typical_problems': profile.typical_problems,
                'background': profile.background,
                'certifications': profile.certifications,
                'methodologies': profile.methodologies,
                'tools_technologies': profile.tools_technologies
            }
            print(f"Loaded expert profile for {expert.email}:", context)
            return context
        except ExpertProfile.DoesNotExist:
            print(f"No profile found for expert {expert.email}")
            return None

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
            print(f"Failed to create OpenAI client: {str(e)}")
            raise e

    def _generate_ai_response(self, message, history, profile, is_initial=False, should_skip_topic=False):
        """Generate AI response using OpenAI"""
        try:
            # Create OpenAI client using helper function
            client = self._create_openai_client()

            # Analyze conversation state
            conversation_length = len(history)
            context_depth = min(conversation_length // 2 + 1, 5)
            
            previous_topics = []
            current_topic = None
            last_ai_message = None
            last_expert_message = None
            
            # Analyze recent conversation history
            for msg in history[-4:]:
                if msg['role'] == 'ai':
                    if 'knowledge_area' in msg:
                        previous_topics.append(msg['knowledge_area'])
                        if len(previous_topics) > 0:
                            current_topic = previous_topics[-1]
                    last_ai_message = msg['content']
                elif msg['role'] == 'expert':
                    last_expert_message = msg['content']

            # Construct the conversation context
            context = f"""You are an AI interviewer conducting a knowledge-gathering conversation with an expert in {profile.get('industry', 'Not specified')}. 

Expert Profile:
Industry: {profile.get('industry', 'Not specified')}
Key Skills: {profile.get('key_skills', 'Not specified')}
Typical Problems: {profile.get('typical_problems', 'Not specified')}
Tools & Technologies: {profile.get('tools_technologies', 'Not specified')}

Your role is to gather comprehensive knowledge about their field through two types of questions:

1. PERSONAL EXPERIENCE QUESTIONS:
   - Their specific projects and work
   - Their unique methodologies and approaches
   - Challenges they've personally overcome
   - Their direct client/customer experiences
   - Their practical implementations and solutions

2. BROADER INDUSTRY QUESTIONS:
   - Current trends and developments in {profile.get('industry', 'their field')}
   - Common challenges and solutions in the industry
   - Best practices and methodologies
   - Industry standards and frameworks
   - Future directions and emerging trends
   - Market dynamics and changes

QUESTION GUIDELINES BY FIELD:

For Art/Creative Fields:
- Personal: "Can you walk me through one of your most challenging exhibitions?"
- Industry: "What trends are you seeing in contemporary art curation?"
- Personal: "How do you approach selecting artists for your shows?"
- Industry: "How has digital technology changed the art market?"

For Technical Fields:
- Personal: "What's the most complex system you've implemented?"
- Industry: "What emerging technologies are reshaping your field?"
- Personal: "How do you approach debugging critical issues?"
- Industry: "What are the current best practices for system architecture?"

For Business/Consulting:
- Personal: "Tell me about a particularly challenging client project"
- Industry: "What major shifts are you seeing in market demands?"
- Personal: "How do you structure your consulting engagements?"
- Industry: "What new business models are emerging in your sector?"

For Academic/Research:
- Personal: "What's your current research focus?"
- Industry: "What are the breakthrough developments in your field?"
- Personal: "How do you approach experimental design?"
- Industry: "What new methodologies are gaining traction?"

INTERVIEW STRATEGY:
1. Alternate between personal experience and industry knowledge questions
2. Use their answers about personal experience to probe deeper into industry trends
3. Use industry discussion to transition into their personal approaches
4. Follow up on interesting points with both personal and industry angles

IMPORTANT:
- Ask ONE clear question at a time
- Balance personal experience questions with industry knowledge questions
- When they mention something interesting, explore both their personal experience with it AND their industry perspective
- Draw connections between their personal approaches and industry trends

Example formats:
Personal Experience:
- "How have you personally handled [specific challenge]?"
- "What's your approach to [specific aspect of their work]?"
- "Can you share a specific example from your work?"

Industry Knowledge:
- "What trends are you seeing in [specific aspect of industry]?"
- "How is [new development] changing your field?"
- "What do you see as the biggest challenges facing the industry?"
"""

            # Add conversation state to context
            if current_topic and len(history) > 0:
                context += f"\nCurrent topic: {current_topic}"
                context += f"\nConversation depth: {context_depth}/5"
                context += "\nPrevious topics: " + ", ".join(previous_topics[-3:])
                if last_ai_message and last_expert_message:
                    context += f"\nLast question asked: {last_ai_message}"
                    context += f"\nExpert's response: {last_expert_message}"
                    context += "\nNow, generate a follow-up question that either dives deeper into their personal experience or explores the broader industry implications of what they discussed."

            # Handle special cases
            if is_initial:
                context += f"""
For the opening question, choose either:
1. A personal experience question about their most significant work
2. A broad industry question about current trends or challenges

Example formats:
Personal: "Could you tell me about the most challenging project you've worked on in {profile.get('industry', 'your field')}?"
Industry: "What do you see as the most significant developments in {profile.get('industry', 'your field')} right now?"
"""
                message = "Please start the interview with an engaging question about either their personal experience or industry knowledge."
            elif should_skip_topic:
                context += f"""
The expert wants to skip the current topic. Choose a new direction:
1. Switch from personal experience to industry trends (or vice versa)
2. Pick a different aspect of {profile.get('industry', 'their field')} to explore
3. Move from specific cases to broader patterns (or vice versa)
"""
                message = "Please transition to a new topic, either personal or industry-focused."
            elif message:
                context += """
The expert has provided a response. Please:
1. Analyze their response for key points
2. Generate a follow-up question that:
   - Builds on specific details they mentioned
   - Encourages them to elaborate or provide examples
   - Helps explore the topic more deeply
3. Never simply repeat or acknowledge their response without a question
4. If their response was brief, ask for more specific details or examples
"""

            # Prepare conversation history
            messages = [
                {"role": "system", "content": context}
            ]
            
            # Add conversation history
            for msg in history:
                role = "assistant" if msg['role'] == 'ai' else "user"
                messages.append({"role": role, "content": msg['content']})
            
            # Add the current message if it exists
            if message:
                messages.append({"role": "user", "content": message})

            print("Sending messages to OpenAI:", json.dumps(messages, indent=2))

            # Get AI response with exponential backoff retry
            max_retries = 3
            retry_delay = 1
            
            for attempt in range(max_retries):
                try:
                    response = client.chat.completions.create(
                        model="gpt-4",
                        messages=messages,
                        temperature=0.7,
                        max_tokens=400,
                        functions=[{
                            "name": "process_response",
                            "description": "Process the AI's response with metadata",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "content": {
                                        "type": "string",
                                        "description": "The actual response content (must be a question)"
                                    },
                                    "context_depth": {
                                        "type": "integer",
                                        "description": "How specific/detailed the conversation is (1-5)"
                                    },
                                    "knowledge_area": {
                                        "type": "string",
                                        "description": "The specific area of knowledge being discussed"
                                    },
                                    "conversation_state": {
                                        "type": "object",
                                        "properties": {
                                            "current_topic": {
                                                "type": "string",
                                                "description": "The current topic being discussed"
                                            },
                                            "is_follow_up": {
                                                "type": "boolean",
                                                "description": "Whether this is a follow-up question to the previous topic"
                                            },
                                            "expert_question": {
                                                "type": "boolean",
                                                "description": "Whether the expert asked a question"
                                            },
                                            "topic_complete": {
                                                "type": "boolean",
                                                "description": "Whether the current topic has been sufficiently explored"
                                            }
                                        }
                                    }
                                },
                                "required": ["content", "context_depth", "knowledge_area", "conversation_state"]
                            }
                        }],
                        function_call={"name": "process_response"}
                    )
                    
                    if response.choices[0].message.function_call:
                        result = json.loads(response.choices[0].message.function_call.arguments)
                        # Verify that the response is actually a question
                        if not any(result['content'].strip().endswith(p) for p in ['?', '؟', '？']):
                            raise Exception("AI response must be a question")
                        print("AI Response:", result)
                        return result
                    else:
                        raise Exception("No function call in response")

                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(retry_delay * (2 ** attempt))
                    continue

        except Exception as e:
            print(f"Error generating AI response: {str(e)}")
            raise e

class OnboardingAnswersView(APIView):
    """
    Endpoint to fetch all completed onboarding answers for review
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        expert = request.user
        
        if not expert.onboarding_completed:
            return Response({
                'error': 'Expert has not completed onboarding yet'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all answers with associated questions
        answers = OnboardingAnswer.objects.filter(
            expert=expert
        ).select_related('question').order_by('question__order')
        
        result = []
        for answer in answers:
            result.append({
                'question_id': answer.question.id,
                'question_text': answer.question.question_text,
                'category': answer.question.category,
                'order': answer.question.order,
                'answer': answer.answer,
                'created_at': answer.created_at
            })
        
        # Return empty list if no answers (simplified onboarding was used)
        return Response({
            'answers': result,
            'total': len(result),
            'onboarding_type': 'detailed' if len(result) > 0 else 'simplified'
        })

class KnowledgeProcessingView(APIView):
    """
    Endpoint to process knowledge from expert profile and training messages
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        expert = request.user
        
        try:
            # Process expert's knowledge
            knowledge_processor = KnowledgeProcessor(expert)
            knowledge_processor.process_expert_profile()
            
            # Process training messages
            training_messages = TrainingMessage.objects.filter(
                expert=expert,
                role='expert'
            ).order_by('created_at')
            
            processed_count = 0
            for message in training_messages:
                try:
                    knowledge_processor.process_training_message(message)
                    processed_count += 1
                except Exception as e:
                    print(f"Error processing message {message.id}: {str(e)}")
            
            return Response({
                'status': 'success',
                'message': f'Successfully processed expert profile and {processed_count} training messages',
                'processed_count': processed_count
            })
            
        except Exception as e:
            print(f"Error processing knowledge: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response({
                'error': f'Failed to process knowledge: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TrainingStatsView(APIView):
    """
    Get accurate training statistics directly from the database
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get training statistics for the authenticated expert"""
        expert = request.user
        
        try:
            # Count actual training messages
            expert_messages = TrainingMessage.objects.filter(
                expert=expert,
                role='expert'
            ).count()
            
            ai_messages = TrainingMessage.objects.filter(
                expert=expert,
                role='ai'
            ).count()
            
            total_messages = expert_messages + ai_messages
            
            # Calculate training minutes (approximately 1 exchange per minute)
            # Each exchange is 1 expert message + 1 AI message = 2 messages
            training_minutes = max(expert_messages, 0)  # Use expert messages as the number of exchanges
            
            # Get latest training message timestamp
            latest_message = TrainingMessage.objects.filter(expert=expert).order_by('-created_at').first()
            last_training_at = latest_message.created_at if latest_message else None
            
            # Check if stored total matches actual count
            stored_total = expert.total_training_messages or 0
            actual_total = total_messages
            
            # Update expert's total if there's a mismatch
            if stored_total != actual_total:
                print(f"Training message count mismatch for {expert.email}: stored={stored_total}, actual={actual_total}")
                expert.total_training_messages = actual_total
                if last_training_at:
                    expert.last_training_at = last_training_at
                expert.save()
            
            return Response({
                'expert_messages': expert_messages,
                'ai_messages': ai_messages,
                'total_messages': actual_total,
                'training_minutes': training_minutes,
                'last_training_at': last_training_at,
                'stored_total': stored_total,
                'updated_total': actual_total
            })
            
        except Exception as e:
            print(f"Error getting training stats: {str(e)}")
            return Response({
                'error': 'Failed to get training statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 