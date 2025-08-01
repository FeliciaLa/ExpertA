from django.db import transaction
from .models import TrainingMessage, ExpertKnowledgeBase, KnowledgeEntry
from openai import OpenAI
from django.conf import settings
import json
from .pinecone_utils import init_pinecone
from django.utils import timezone

class KnowledgeProcessor:
    """Service to process and store expert knowledge from training conversations"""
    
    def __init__(self, expert):
        self.expert = expert
        self.client = self._create_openai_client()
        self.index = init_pinecone()
        
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
            print(f"Failed to create OpenAI client in KnowledgeProcessor: {str(e)}")
            raise e
        
    @transaction.atomic
    def process_training_message(self, message: TrainingMessage):
        """Process a new training message and update the knowledge base"""
        # Only process expert messages
        if message.role != 'expert':
            return  # Only process expert messages
            
        # Get or create knowledge base
        knowledge_base, _ = ExpertKnowledgeBase.objects.get_or_create(
            expert=self.expert,
            defaults={
                'knowledge_areas': {},
                'context_vectors': {},
                'training_summary': f"Expert in {self.expert.profile.industry} with {self.expert.profile.years_of_experience} years of experience."
            }
        )
        
        # Extract knowledge from the message
        knowledge = self._extract_knowledge(message)
        
        # Store the extracted knowledge
        if knowledge:
            print("\n=== Storing Knowledge ===")
            print(f"Content: {knowledge['content'][:100]}...")
            print(f"Confidence: {knowledge['confidence_score']}")
            print(f"Key Concepts: {knowledge['key_concepts']}")
            
            # Create knowledge entry
            entry = KnowledgeEntry.objects.create(
                knowledge_base=knowledge_base,
                topic=message.knowledge_area or knowledge['key_concepts'][0],
                content=message.content,  # Store the exact message content
                source_message=message,
                context_depth=message.context_depth,
                confidence_score=knowledge.get('confidence_score', 1.0)
            )
            print(f"Created KnowledgeEntry with ID: {entry.id}")
            
            # Store in Pinecone
            try:
                # Generate embedding for the knowledge content
                embedding_response = self.client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=message.content  # Use exact message content
                )
                embedding = embedding_response.data[0].embedding[:1024]
                print("Generated embedding for content")
                
                # Store in Pinecone with consistent metadata
                self.index.upsert(
                    vectors=[{
                        'id': str(entry.id),
                        'values': embedding,
                        'metadata': {
                            'id': str(entry.id),
                            'expert_id': str(self.expert.id),
                            'text': message.content,  # Use exact message content
                            'topic': entry.topic,
                            'created_at': str(timezone.now()),
                            'context_depth': entry.context_depth,
                            'confidence_score': entry.confidence_score,
                            'expert_email': self.expert.email
                        }
                    }]
                )
                print("Stored in Pinecone successfully")
                
            except Exception as e:
                print(f"Error storing in Pinecone: {str(e)}")
                # Continue even if Pinecone fails
                
            # Update knowledge base summary
            self._update_knowledge_base(knowledge_base)
            
            print("=== Knowledge Stored Successfully ===\n")
        else:
            print("No knowledge extracted from message")
    
    def _extract_knowledge(self, message: TrainingMessage) -> dict:
        """Extract structured knowledge from a training message"""
        try:
            prompt = f"""Extract key knowledge and insights from this expert message.

MESSAGE: {message.content}

Extract:
1. Main concepts/topics discussed
2. Key insights or advice given
3. Specific examples or case studies mentioned
4. Technical details or methodologies
5. Best practices or recommendations

Return as JSON:
{{
    "content": "main knowledge content",
    "key_concepts": ["concept1", "concept2", "concept3"],
    "confidence_score": 0.9,
    "insights": ["insight1", "insight2"],
    "examples": ["example1", "example2"]
}}"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse JSON response
            knowledge_data = json.loads(response.choices[0].message.content.strip())
            
            # Ensure required fields
            knowledge_data.setdefault('confidence_score', 0.8)
            knowledge_data.setdefault('key_concepts', [])
            knowledge_data.setdefault('insights', [])
            knowledge_data.setdefault('examples', [])
            
            return knowledge_data
            
        except Exception as e:
            print(f"Error extracting knowledge: {str(e)}")
            # Return basic structure if extraction fails
            return {
                'content': message.content,
                'key_concepts': [message.knowledge_area or 'general'],
                'confidence_score': 0.5,
                'insights': [],
                'examples': []
            }
    
    def _update_knowledge_base(self, knowledge_base: ExpertKnowledgeBase):
        """Update the knowledge base with new insights"""
        try:
            # Get recent entries
            recent_entries = KnowledgeEntry.objects.filter(
                knowledge_base=knowledge_base
            ).order_by('-created_at')[:10]
            
            # Create summary of recent knowledge
            summary_parts = []
            for entry in recent_entries:
                summary_parts.append(f"- {entry.topic}: {entry.content[:100]}...")
            
            knowledge_base.training_summary = "\n".join(summary_parts)
            knowledge_base.save()
            
        except Exception as e:
            print(f"Error updating knowledge base: {str(e)}")
    
    def process_document(self, document_id, content):
        """Process a document and extract knowledge"""
        try:
            # Get or create knowledge base
            knowledge_base, _ = ExpertKnowledgeBase.objects.get_or_create(
                expert=self.expert,
                defaults={
                    'knowledge_areas': {},
                    'context_vectors': {},
                    'training_summary': f"Expert in {self.expert.profile.industry} with {self.expert.profile.years_of_experience} years of experience."
                }
            )
            
            # Extract knowledge from document
            knowledge = self._extract_knowledge_from_document(content)
            
            if knowledge:
                # Create knowledge entry
                entry = KnowledgeEntry.objects.create(
                    knowledge_base=knowledge_base,
                    topic=knowledge['key_concepts'][0] if knowledge['key_concepts'] else 'Document',
                    content=content,
                    context_depth=2,
                    confidence_score=knowledge.get('confidence_score', 0.8)
                )
                
                # Store in Pinecone
                self._add_to_pinecone(entry.id, content, {
                    'id': str(entry.id),
                    'expert_id': str(self.expert.id),
                    'text': content,
                    'topic': entry.topic,
                    'created_at': str(timezone.now()),
                    'context_depth': entry.context_depth,
                    'confidence_score': entry.confidence_score,
                    'expert_email': self.expert.email
                })
                
                print(f"Processed document {document_id} successfully")
            else:
                print(f"No knowledge extracted from document {document_id}")
                
        except Exception as e:
            print(f"Error processing document {document_id}: {str(e)}")
    
    def _extract_knowledge_from_document(self, content):
        """Extract knowledge from document content"""
        try:
            prompt = f"""Extract key knowledge and insights from this document.

DOCUMENT: {content[:2000]}...

Extract:
1. Main topics covered
2. Key insights or findings
3. Important concepts
4. Recommendations or conclusions

Return as JSON:
{{
    "key_concepts": ["concept1", "concept2"],
    "insights": ["insight1", "insight2"],
    "confidence_score": 0.9
}}"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=300
            )
            
            return json.loads(response.choices[0].message.content.strip())
            
        except Exception as e:
            print(f"Error extracting knowledge from document: {str(e)}")
            return None
    
    def _add_to_pinecone(self, entry_id, text, metadata):
        """Add knowledge entry to Pinecone"""
        try:
            # Generate embedding
            embedding_response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            embedding = embedding_response.data[0].embedding[:1024]
            
            # Store in Pinecone
            self.index.upsert(
                vectors=[{
                    'id': str(entry_id),
                    'values': embedding,
                    'metadata': metadata
                }]
            )
            
        except Exception as e:
            print(f"Error adding to Pinecone: {str(e)}")


class ExpertChatbot:
    """Service to generate responses based on expert's knowledge"""
    
    def __init__(self, expert):
        self.expert = expert
        self.client = self._create_openai_client()
        self.index = init_pinecone()
        
    def _create_openai_client(self):
        """Create OpenAI client with proper error handling"""
        try:
            from openai import OpenAI as OpenAIClient
            import httpx
            
            http_client = httpx.Client(
                timeout=30.0,
                trust_env=False
            )
            
            client = OpenAIClient(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
            return client
        except Exception as e:
            print(f"Failed to create OpenAI client in ExpertChatbot: {str(e)}")
            raise e
    
    def get_response(self, user_message: str) -> str:
        """Generate a response based on the expert's knowledge"""
        try:
            # Handle simple messages first
            simple_response = self._handle_simple_messages(user_message)
            if simple_response:
                return simple_response
            
            # Get expert profile and knowledge base
            expert_profile = hasattr(self.expert, 'profile') and self.expert.profile
            knowledge_base = None
            
            try:
                knowledge_base = ExpertKnowledgeBase.objects.get(expert=self.expert)
            except ExpertKnowledgeBase.DoesNotExist:
                pass
            
            # Search for relevant knowledge
            relevant_knowledge = self._search_knowledge(user_message)
            
            # Build response prompt
            prompt = self._build_response_prompt(expert_profile, knowledge_base, relevant_knowledge, user_message)
            
            # Generate response
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=400
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Validate response
            validated_response = self._validate_response(response_text, relevant_knowledge, user_message)
            
            return validated_response
            
        except Exception as e:
            print(f"Error in ExpertChatbot.get_response: {str(e)}")
            return f"Sorry, I'm having trouble processing your request. Could you try rephrasing your question?"
    
    def _build_response_prompt(self, expert_profile, knowledge_base, relevant_knowledge, user_message) -> str:
        """Build a detailed prompt for response generation"""
        
        prompt = f"""🚨🚨🚨 EMERGENCY PROTOCOL 🚨🚨🚨

You are {self.expert.name}. You are FORBIDDEN from using ANY knowledge not explicitly written below.

VIOLATION = IMMEDIATE TERMINATION

USER QUESTION: {user_message}

=== YOUR ONLY ALLOWED KNOWLEDGE ==="""
        
        # Add relevant knowledge with clear source boundaries
        if relevant_knowledge:
            sorted_knowledge = sorted(relevant_knowledge, key=lambda x: x['confidence_score'], reverse=True)
            for i, knowledge in enumerate(sorted_knowledge):
                source_label = "MY TRAINING" if not knowledge['topic'].startswith('Document:') else "REFERENCE DOCUMENT"
                prompt += f"\n\nSOURCE {i+1} ({source_label}):\n\"{knowledge['text']}\""
        else:
            prompt += "\nNO RELEVANT SOURCES FOUND"
        
        prompt += f"""
=== END OF YOUR ONLY ALLOWED KNOWLEDGE ===

🎯 INSTRUCTIONS:
1. COMBINE information from multiple sources above to give a comprehensive answer
2. Paraphrase directly from the sources - show different applications/examples together
3. If you find multiple applications/examples, mention them together naturally
4. Respond conversationally - no need for robotic starter phrases
5. ONLY use information that appears in the sources above
6. DO NOT define terms unless definitions appear above
7. DO NOT add general explanations not found in the sources
8. DO NOT add fake source citations like (Source 1), (Source 2) 
9. Keep your answer complete but focused - aim for 2-3 sentences that thoroughly address the question

Answer naturally using only the sources above:"""
        
        return prompt 
    
    def _handle_simple_messages(self, user_message: str) -> str:
        """Handle simple conversational messages like greetings without triggering full knowledge search"""
        try:
            # Use AI to classify the intent of the message
            intent = self._classify_message_intent(user_message)
            
            if intent == "greeting":
                return self._generate_greeting_response()
            elif intent == "casual":
                return self._generate_casual_response(user_message)
            else:
                # It's a real question - proceed with normal knowledge search
                return None
                
        except Exception as e:
            # If classification fails, default to normal knowledge search
            print(f"Intent classification failed: {e}")
            return None
    
    def _classify_message_intent(self, user_message: str) -> str:
        """Use AI to classify if message is greeting, casual chat, or real question"""
        try:
            prompt = f"""Classify this message into one of three categories:

Message: "{user_message}"

Categories:
- "greeting" = hello, hi, hey, good morning, etc.
- "casual" = how are you, thanks, bye, yes/no responses, small talk
- "question" = real questions seeking information or advice

Respond with ONLY the category word: greeting, casual, or question"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.1,
                max_tokens=10
            )
            
            intent = response.choices[0].message.content.strip().lower()
            
            # Validate response
            if intent in ["greeting", "casual", "question"]:
                return intent
            else:
                return "question"  # Default to question if unclear
                
        except Exception as e:
            print(f"Intent classification error: {e}")
            return "question"  # Safe default
    
    def _generate_casual_response(self, user_message: str) -> str:
        """Generate appropriate casual responses"""
        try:
            prompt = f"""Generate a brief, friendly response to this casual message:

Message: "{user_message}"

Keep it natural and conversational. 1-2 sentences max."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=50
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            # Fallback responses
            if "thanks" in user_message.lower() or "thank you" in user_message.lower():
                return "You're welcome! Happy to help."
            elif "bye" in user_message.lower() or "goodbye" in user_message.lower():
                return "Goodbye! Feel free to reach out if you have more questions."
            else:
                return "Is there anything specific you'd like to know more about?"
    
    def _generate_greeting_response(self) -> str:
        """Generate a contextual greeting response based on expert's profile"""
        try:
            # Get expert profile info
            expert_profile = hasattr(self.expert, 'profile') and self.expert.profile
            specialties = getattr(self.expert, 'specialties', '')
            bio = getattr(self.expert, 'bio', '')
            industry = getattr(expert_profile, 'industry', '') if expert_profile else ''
            
            # Create a simple prompt for greeting generation
            prompt = f"""You are an AI assistant representing {self.expert.name}. Generate a warm, brief greeting response (1-2 sentences) that:

1. Greets them back warmly
2. Introduces yourself as "{self.expert.name}'s AI" 
3. Mentions what you can help with based on your expertise

Your expertise:
- Bio: {bio or 'Not specified'}
- Specialties: {specialties or 'Not specified'}  
- Industry: {industry or 'Not specified'}

Example style: "Hello! I'm {self.expert.name}'s AI and I specialize in [area]. Feel free to ask me anything about [specific topics you help with]."

Keep it natural, warm, and concise. Don't use formal lists or bullet points."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=100
            )
            
            greeting = response.choices[0].message.content.strip()
            return greeting
            
        except Exception as e:
            # Fallback to simple greeting if AI generation fails
            return f"Hello! I'm {self.expert.name}. Feel free to ask me anything about {getattr(self.expert, 'specialties', 'my area of expertise')}!"
    
    def _validate_response(self, response: str, knowledge_sources: list, user_message: str) -> str:
        """Validate response doesn't contain hallucinations"""
        
        # Check for common hallucination indicators
        hallucination_phrases = [
            "typically", "usually", "often", "generally", "commonly", "most",
            "for example", "such as", "including", "like", "among others",
            "it is important to", "it should be noted", "it's worth mentioning",
            "in general", "overall", "furthermore", "moreover", "additionally",
            "this means", "this allows", "this enables", "this helps",
            "consists of", "made up of", "composed of", "involves",
            "process of", "method of", "technique of", "approach to"
        ]
        
        response_lower = response.lower()
        for phrase in hallucination_phrases:
            if phrase in response_lower:
                print(f"HALLUCINATION DETECTED: Found phrase '{phrase}' in response")
                return f"I only have limited information about that topic. Let me know if you'd like me to share what I do know specifically."
        
        # Additional validation: Use a second model to verify the response
        try:
            if len(response) > 50:  # Only validate substantial responses
                validation_prompt = f"""
                Check if this response contains ONLY information that can be found in the provided sources.
                
                SOURCES:
                {chr(10).join([k['text'] for k in knowledge_sources]) if knowledge_sources else "No sources provided"}
                
                RESPONSE TO CHECK:
                {response}
                
                Reply with ONLY "VALID" if the response uses only information from the sources, or "INVALID" if it adds information not in the sources.
                """
                
                validation_response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": validation_prompt}],
                    temperature=0.1,
                    max_tokens=10
                )
                
                validation_result = validation_response.choices[0].message.content.strip().upper()
                if "INVALID" in validation_result:
                    print(f"SECOND MODEL VALIDATION FAILED: Response marked as invalid")
                    return f"I want to make sure I give you accurate information. Let me know if you'd like me to share the specific details I do have about this topic."
        except Exception as e:
            print(f"Validation check failed: {e}")
            pass  # Continue with original response if validation fails
        
        # If response passes all validation, return it
        return response 
    
    def _handle_simple_messages(self, user_message: str) -> str:
        """Handle simple conversational messages like greetings without triggering full knowledge search"""
        try:
            # Use AI to classify the intent of the message
            intent = self._classify_message_intent(user_message)
            
            if intent == "greeting":
                return self._generate_greeting_response()
            elif intent == "casual":
                return self._generate_casual_response(user_message)
            else:
                # It's a real question - proceed with normal knowledge search
                return None
                
        except Exception as e:
            # If classification fails, default to normal knowledge search
            print(f"Intent classification failed: {e}")
            return None
    
    def _classify_message_intent(self, user_message: str) -> str:
        """Use AI to classify if message is greeting, casual chat, or real question"""
        try:
            prompt = f"""Classify this message into one of three categories:

Message: "{user_message}"

Categories:
- "greeting" = hello, hi, hey, good morning, etc.
- "casual" = how are you, thanks, bye, yes/no responses, small talk
- "question" = real questions seeking information or advice

Respond with ONLY the category word: greeting, casual, or question"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.1,
                max_tokens=10
            )
            
            intent = response.choices[0].message.content.strip().lower()
            
            # Validate response
            if intent in ["greeting", "casual", "question"]:
                return intent
            else:
                return "question"  # Default to question if unclear
                
        except Exception as e:
            print(f"Intent classification error: {e}")
            return "question"  # Safe default
    
    def _generate_casual_response(self, user_message: str) -> str:
        """Generate appropriate casual responses"""
        try:
            prompt = f"""Generate a brief, friendly response to this casual message:

Message: "{user_message}"

Keep it natural and conversational. 1-2 sentences max."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=50
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            # Fallback responses
            if "thanks" in user_message.lower() or "thank you" in user_message.lower():
                return "You're welcome! Happy to help."
            elif "bye" in user_message.lower() or "goodbye" in user_message.lower():
                return "Goodbye! Feel free to reach out if you have more questions."
            else:
                return "Is there anything specific you'd like to know more about?"
    
    def _generate_greeting_response(self) -> str:
        """Generate a contextual greeting response based on expert's profile"""
        try:
            # Get expert profile info
            expert_profile = hasattr(self.expert, 'profile') and self.expert.profile
            specialties = getattr(self.expert, 'specialties', '')
            bio = getattr(self.expert, 'bio', '')
            industry = getattr(expert_profile, 'industry', '') if expert_profile else ''
            
            # Create a simple prompt for greeting generation
            prompt = f"""You are an AI assistant representing {self.expert.name}. Generate a warm, brief greeting response (1-2 sentences) that:

1. Greets them back warmly
2. Introduces yourself as "{self.expert.name}'s AI" 
3. Mentions what you can help with based on your expertise

Your expertise:
- Bio: {bio or 'Not specified'}
- Specialties: {specialties or 'Not specified'}  
- Industry: {industry or 'Not specified'}

Example style: "Hello! I'm {self.expert.name}'s AI and I specialize in [area]. Feel free to ask me anything about [specific topics you help with]."

Keep it natural, warm, and concise. Don't use formal lists or bullet points."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=100
            )
            
            greeting = response.choices[0].message.content.strip()
            return greeting
            
        except Exception as e:
            # Fallback to simple greeting if AI generation fails
            return f"Hello! I'm {self.expert.name}'s AI. Feel free to ask me anything about {getattr(self.expert, 'specialties', 'my area of expertise')}!"
    
    def _search_knowledge(self, user_message: str):
        """Search for relevant knowledge based on user message"""
        try:
            # Create embedding for the user message
            embedding_response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=user_message
            )
            query_vector = embedding_response.data[0].embedding[:1024]
            
            # Search Pinecone for relevant knowledge
            search_results = self.index.query(
                vector=query_vector,
                top_k=5,
                filter={"expert_email": self.expert.email},
                include_metadata=True
            )
            
            # Format search results
            relevant_knowledge = []
            for match in search_results['matches']:
                if match['score'] > 0.7:  # Relevance threshold
                    relevant_knowledge.append({
                        'text': match['metadata'].get('text', ''),
                        'confidence_score': match['score'],
                        'topic': match['metadata'].get('topic', 'General')
                    })
            
            return relevant_knowledge
            
        except Exception as e:
            print(f"Error searching knowledge: {str(e)}")
            return [] 