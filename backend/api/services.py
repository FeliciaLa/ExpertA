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
                            'key_concepts': knowledge['key_concepts'],
                            'source': 'expert_training',
                            'message_id': str(message.id)
                        }
                    }]
                )
                print(f"Stored in Pinecone with ID: {entry.id}")
                
                # Update knowledge base areas
                areas = knowledge_base.knowledge_areas
                for concept in knowledge['key_concepts']:
                    if concept in areas:
                        areas[concept]['count'] = areas[concept].get('count', 0) + 1
                        areas[concept]['last_updated'] = str(timezone.now())
                    else:
                        areas[concept] = {
                            'count': 1,
                            'first_seen': str(timezone.now()),
                            'last_updated': str(timezone.now())
                        }
                knowledge_base.knowledge_areas = areas
                knowledge_base.save()
                print(f"Updated knowledge areas: {list(areas.keys())}")
                
            except Exception as e:
                print(f"Error storing in Pinecone: {str(e)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
            
            # Update knowledge base summary
            self._update_knowledge_base(knowledge_base)
    
    def _extract_knowledge(self, message: TrainingMessage) -> dict:
        """Extract structured knowledge from an expert's message"""
        try:
            system_prompt = """Extract key concepts from the expert's message.
            DO NOT add any information or interpretation not explicitly stated in the message.
            Focus ONLY on what the expert has directly stated."""

            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"""
                    Topic: {message.knowledge_area}
                    Message: {message.content}
                    
                    Extract ONLY the explicitly stated information. Do not add interpretations or expansions.
                    """}
                ],
                functions=[{
                    "name": "extract_knowledge",
                    "description": "Extract and structure knowledge from message",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The exact knowledge as stated by the expert"
                            },
                            "confidence_score": {
                                "type": "number",
                                "description": "Confidence in the extracted knowledge (0-1)"
                            },
                            "key_concepts": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Key concepts explicitly mentioned in the message"
                            }
                        },
                        "required": ["content", "confidence_score", "key_concepts"]
                    }
                }],
                function_call={"name": "extract_knowledge"}
            )
            
            if response.choices[0].message.function_call:
                return json.loads(response.choices[0].message.function_call.arguments)
            
        except Exception as e:
            print(f"Error extracting knowledge: {str(e)}")
            return None
    
    def _update_knowledge_base(self, knowledge_base: ExpertKnowledgeBase):
        """Update the overall knowledge base summary and structure"""
        try:
            # Get all knowledge entries
            entries = knowledge_base.entries.all()
            
            # Simply track which topics exist without generating descriptions
            # This prevents GPT from hallucinating interpretative content
            knowledge_areas = {}
            for entry in entries:
                if entry.topic not in knowledge_areas:
                    # Just store the topic name without any generated description
                    knowledge_areas[entry.topic] = f"Trained on: {entry.topic}"
            
            # Update knowledge base with simple topic list (no descriptions)
            knowledge_base.knowledge_areas = knowledge_areas
            knowledge_base.save()
            print(f"Updated knowledge areas (topic list only): {list(knowledge_areas.keys())}")
            
        except Exception as e:
            print(f"Error updating knowledge base: {str(e)}")
    
    def process_document(self, document_id, content):
        """
        Process document content and add to knowledge base
        """
        # Skip empty content
        if not content.strip():
            print(f"Empty document content for document_id {document_id}")
            return
            
        print(f"Processing document {document_id} for expert {self.expert.email}")
        
        # Split content into chunks (basic implementation)
        # In a real app, you'd use more sophisticated chunking
        chunk_size = 1000
        chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
        
        for i, chunk in enumerate(chunks):
            # Create a unique ID for this chunk
            entry_id = f"doc_{document_id}_chunk_{i}"
            
            # Prepare metadata - ensure all values are proper types for Pinecone
            metadata = {
                "expert_id": str(self.expert.id),  # Convert UUID to string
                "source": "document",
                "document_id": str(document_id),  # Ensure document_id is string
                "chunk_index": i,
                "content_type": "text",
            }
            
            # Get embedding for this chunk
            try:
                self._add_to_pinecone(entry_id, chunk, metadata)
                print(f"Added document chunk {i} to Pinecone (document_id: {document_id})")
            except Exception as e:
                print(f"Error adding document chunk to Pinecone: {str(e)}")
                raise
    
    def _add_to_pinecone(self, entry_id, text, metadata):
        """
        Generate embedding for text and add to Pinecone
        """
        try:
            # Generate embedding
            embedding_response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            embedding = embedding_response.data[0].embedding[:1024]
            
            # Ensure all metadata values are properly formatted for Pinecone
            safe_metadata = {}
            for key, value in metadata.items():
                if key == 'expert_id':
                    safe_metadata[key] = str(value)  # Always convert expert_id to string
                elif hasattr(value, '__str__'):
                    safe_metadata[key] = str(value) if not isinstance(value, (str, int, float, bool)) else value
                else:
                    safe_metadata[key] = value
            
            # Add to Pinecone
            self.index.upsert(
                vectors=[{
                    'id': str(entry_id),
                    'values': embedding,
                    'metadata': {
                        'id': str(entry_id),
                        'expert_id': str(self.expert.id),
                        'text': text[:1000],  # Store partial text if too long
                        'created_at': str(timezone.now()),
                        **safe_metadata
                    }
                }]
            )
            return True
        except Exception as e:
            print(f"Error in _add_to_pinecone: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise

class ExpertChatbot:
    """Service to generate responses based on expert's knowledge"""
    
    def __init__(self, expert):
        self.expert = expert
        self.client = self._create_openai_client()
        self.index = init_pinecone()
        
        if not self.index:
            raise Exception("Failed to initialize vector database. Please check your Pinecone API key and settings.")
    
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
            print(f"Failed to create OpenAI client in ExpertChatbot: {str(e)}")
            raise e
    
    def get_response(self, user_message: str) -> str:
        """Generate a response using the expert's knowledge base"""
        try:
            # Get the expert's profile and knowledge base (optimized with select_related)
            try:
                expert_profile = hasattr(self.expert, 'profile') and self.expert.profile
                knowledge_base = ExpertKnowledgeBase.objects.select_related('expert').filter(expert=self.expert).first()
                
            except Exception as e:
                return "I'm currently experiencing some technical difficulties accessing my knowledge. Please try again later."
            
            # Check profile completeness
            if not expert_profile or not getattr(expert_profile, 'industry', None) or not getattr(expert_profile, 'key_skills', None):
                return "I apologize, but my profile setup is incomplete. Please contact the administrator to complete my expert profile setup."
            
            if not knowledge_base or not getattr(knowledge_base, 'knowledge_areas', None):
                return "I haven't been fully trained yet. Please contact the administrator to complete my training process."
            
            # Generate embeddings for the user's message
            try:
                query_embedding = self.client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=user_message
                ).data[0].embedding[:1024]
            except Exception as e:
                return "I'm sorry, I'm having trouble processing your question right now. Could you try again later?"
            
            # Query Pinecone for relevant knowledge
            try:
                # Use expert_id filter to get ALL content for this expert (both chat training and documents)
                filter_query = {"expert_id": str(self.expert.id)}
                
                # First try with higher threshold
                query_response = self.index.query(
                    vector=query_embedding,
                    filter=filter_query,
                    top_k=3,  # Reduced for speed
                    include_metadata=True
                )
                
                # If no good matches, try with lower threshold
                if not query_response.matches or all(match.score < 0.2 for match in query_response.matches):
                    query_response = self.index.query(
                        vector=query_embedding,
                        filter=filter_query,
                        top_k=5,  # Still keep it small
                        include_metadata=True
                    )
            except Exception as e:
                return "I'm having trouble accessing my knowledge base right now. Could you please try again later?"
            
            # Process matches and build context
            relevant_knowledge = []
            for match in query_response.matches:
                if match.score >= 0.05:  # Very low threshold to be more inclusive
                    knowledge_text = match.metadata.get('text', '').strip()
                    topic = match.metadata.get('topic', 'General')
                    context_depth = match.metadata.get('context_depth', 1)
                    confidence_score = match.metadata.get('confidence_score', 0.5)
                    key_concepts = match.metadata.get('key_concepts', [])
                    
                    # STRICT QUALITY CHECK: Reject low-quality knowledge
                    if len(knowledge_text) < 20:  # Less than 20 characters
                        continue
                    
                    if len(knowledge_text.split()) < 4:  # Less than 4 words
                        continue
                        
                    if confidence_score < 0.3:  # Very low confidence
                        continue
                    
                    relevant_knowledge.append({
                        'text': knowledge_text,
                        'topic': topic,
                        'score': match.score,
                        'context_depth': context_depth,
                        'confidence_score': confidence_score,
                        'key_concepts': key_concepts
                    })
            
            if not relevant_knowledge:
                # Return early with a helpful message about what topics the expert does know about
                available_topics = []
                if knowledge_base and knowledge_base.knowledge_areas:
                    available_topics = list(knowledge_base.knowledge_areas.keys())
                
                if available_topics:
                    return f"I don't have specific training or experience on that topic. However, I've been specifically trained on: {', '.join(available_topics)}. Feel free to ask me about any of these areas!"
                else:
                    return "I haven't been trained on that specific topic yet. Please contact the administrator to expand my training, or try asking about other topics."
            
            # Build prompt for response generation
            prompt = self._build_response_prompt(expert_profile, knowledge_base, relevant_knowledge, user_message)
            
            # Generate response
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Faster than gpt-4, better instruction following than 3.5-turbo
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.7,
                    max_tokens=150  # Shorter responses for chat-like conversation
                )
                
                final_response = response.choices[0].message.content
                return final_response
            except Exception as e:
                return "I'm having trouble formulating my response right now. Could you please try again later?"
            
        except Exception as e:
            return "I'm having technical difficulties answering your question. Please try again or rephrase your question."
    
    def _build_response_prompt(self, expert_profile, knowledge_base, relevant_knowledge, user_message) -> str:
        """Build a detailed prompt for response generation"""
        
        prompt = f"""You are {self.expert.name}, an expert in {expert_profile.industry}. Respond in FIRST PERSON as if you ARE the expert, not as an assistant speaking on behalf of the expert.

CRITICAL INSTRUCTIONS:
1. Speak naturally and directly - don't use phrases like "I can share that" or "I'd be happy to tell you"
2. You must ONLY use the knowledge explicitly provided below. DO NOT add information that wasn't provided.
3. You can paraphrase and speak naturally about the provided knowledge, but don't add extra facts, details, or interpretations beyond what's stated.
4. Give natural answers based on your training. NEVER mention what you don't know unless directly asked.
5. Never make up or add information that isn't explicitly stated in the provided knowledge sections below.
6. Be helpful and conversational. Focus on what you DO know, not what you don't know.
7. Your responses should sound natural and conversational, like a real expert would speak.
8. Keep responses concise and conversational - avoid being overly verbose or lecture-like.
9. IGNORE any general knowledge you may have about this topic - ONLY use what's provided below.

Below is the ONLY knowledge you are allowed to use (from my specific training and experience):"""
        
        # Add relevant knowledge
        if relevant_knowledge:
            for knowledge in sorted(relevant_knowledge, key=lambda x: x['score'], reverse=True):
                prompt += f"\n\nMY TRAINING/EXPERIENCE:\n{knowledge['text']}"
        
        # Add training summary if available
        if knowledge_base and knowledge_base.training_summary:
            prompt += f"\n\nMY BACKGROUND:\n{knowledge_base.training_summary}"
        
        # REMOVED: Do not include knowledge_areas descriptions as they contain general information
        # This was causing the AI to generate responses based on broad topic descriptions
        # rather than specific trained knowledge
        
        prompt += f"""

REMEMBER:
- Respond as {self.expert.name} in the first person
- Use ONLY the facts from the knowledge provided above - don't add extra information
- Speak naturally about what you know - don't reference "training" or "from my training"
- Give confident answers without ANY disclaimers about what you don't know
- NEVER mention training, what you were taught, or what you can't do unless DIRECTLY asked
- Be conversational and helpful, speaking as a natural expert would
- Keep responses concise and natural, like a normal conversation
- ABSOLUTELY NEVER use general knowledge, external information, or anything not explicitly stated above
- Don't add facts or details that weren't provided
- Focus on what you DO know, not what you don't know
- The knowledge sections above are your COMPLETE knowledge base - nothing else exists

The user's question is: {user_message}"""
        
        return prompt 