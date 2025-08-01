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
            # Handle simple conversational messages first
            simple_greeting = self._handle_simple_messages(user_message)
            if simple_greeting:
                return simple_greeting
            
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
            
            # Query Pinecone for relevant knowledge from BOTH chat training AND documents
            try:
                # Get knowledge entry IDs for chat training data
                entry_ids = [str(entry.id) for entry in KnowledgeEntry.objects.filter(knowledge_base=knowledge_base)]
                
                # Create filter to include both chat training AND document chunks for this expert
                if entry_ids:
                    filter_query = {
                        "$or": [
                            {"id": {"$in": entry_ids}},  # Chat training data
                            {"expert_id": str(self.expert.id), "source": "document"}  # Document chunks
                        ]
                    }
                else:
                    # If no training data, only search documents
                    filter_query = {"expert_id": str(self.expert.id), "source": "document"}
                
                # Query with semantic similarity - let relevance determine what's useful
                query_response = self.index.query(
                    vector=query_embedding,
                    filter=filter_query,
                    top_k=8,  # Get more candidates to choose from both sources
                    include_metadata=True
                )
                
                # If no good matches, try with broader search
                if not query_response.matches or all(match.score < 0.15 for match in query_response.matches):
                    query_response = self.index.query(
                        vector=query_embedding,
                        filter=filter_query,
                        top_k=12,  # Even more candidates
                        include_metadata=True
                    )
            except Exception as e:
                return "I'm having trouble accessing my knowledge base right now. Could you please try again later?"
            
            # Process matches and build context from BOTH sources
            relevant_knowledge = []
            print(f"NEURAL DEBUG: Processing {len(query_response.matches)} matches for query")
            for i, match in enumerate(query_response.matches):
                print(f"NEURAL DEBUG Match {i}: score={match.score:.3f}, source={match.metadata.get('source')}, id={match.id}")
                print(f"NEURAL DEBUG Match {i} text: {match.metadata.get('text', '')[:100]}...")
                
                if match.score >= 0.1:  # Reasonable threshold for relevance
                    knowledge_text = match.metadata.get('text', '').strip()
                    
                    # Apply quality filters - balanced approach for legitimate content
                    source = match.metadata.get('source', 'expert_training')
                    if source == 'document':
                        # More reasonable filters for documents to allow legitimate content
                        min_chars = 30
                        min_words = 6
                    elif source != 'document' and match.score > 0.8:
                        # High-confidence expert training - lenient filters
                        min_chars = 15
                        min_words = 3
                    else:
                        # Normal filters for low-confidence training data
                        min_chars = 20
                        min_words = 4
                        
                    if len(knowledge_text) < min_chars or len(knowledge_text.split()) < min_words:
                        print(f"NEURAL DEBUG Match {i}: REJECTED - too short ({len(knowledge_text)} chars, {len(knowledge_text.split())} words, threshold: {min_chars})")
                        continue
                        
                    # Determine source and set metadata accordingly
                    source = match.metadata.get('source', 'expert_training')  # Default to expert training
                    if source == 'document':
                        # Use document filename if available, otherwise document_id
                        doc_name = match.metadata.get('filename', match.metadata.get('document_id', 'Document'))
                        topic = f"Document: {doc_name}"
                        context_depth = 2  # Documents tend to have good context
                        confidence_score = match.score  # No boost for documents - they're just reference
                    else:
                        # Chat training (expert_training) is the expert's actual opinions and experiences - prioritize it!
                        topic = match.metadata.get('topic', 'Training Chat')
                        context_depth = match.metadata.get('context_depth', 1)
                        confidence_score = min(match.score * 1.25, 1.0)  # Boost expert's actual training
                    key_concepts = match.metadata.get('key_concepts', [])
                    
                    # STRICT QUALITY CHECK: Reject low-quality knowledge
                    if len(knowledge_text) < 20:  # Less than 20 characters
                        continue
                    
                    if len(knowledge_text.split()) < 4:  # Less than 4 words
                        continue
                        
                    if confidence_score < 0.3:  # Very low confidence
                        print(f"NEURAL DEBUG Match {i}: REJECTED - low confidence ({confidence_score:.3f})")
                        continue
                    
                    print(f"NEURAL DEBUG Match {i}: ACCEPTED - source={source}, confidence={confidence_score:.3f}")
                    relevant_knowledge.append({
                        'text': knowledge_text,
                        'topic': topic,
                        'score': match.score,
                        'context_depth': context_depth,
                        'confidence_score': confidence_score,
                        'key_concepts': key_concepts
                    })
            
            print(f"NEURAL DEBUG: Final knowledge count: {len(relevant_knowledge)}")
            for i, knowledge in enumerate(relevant_knowledge):
                print(f"NEURAL DEBUG Final {i}: topic='{knowledge['topic']}', confidence={knowledge['confidence_score']:.3f}")
                print(f"NEURAL DEBUG Final {i} text: {knowledge['text'][:200]}...")
            
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
            print(f"PROMPT DEBUG: {prompt[:1000]}...")  # Show first 1000 chars of prompt
            
            # Generate response with multiple anti-hallucination measures
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Better instruction following
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.3,  # Lower temperature for more adherence to instructions
                    top_p=0.9,        # Focus on most likely tokens
                    frequency_penalty=0.2  # Discourage repetitive elaboration
                )
                
                raw_response = response.choices[0].message.content
                
                # Temporarily disable validation to see raw response
                print(f"RAW RESPONSE: {raw_response}")
                return raw_response
                
                # Validate response doesn't contain hallucinations
                # validated_response = self._validate_response(raw_response, relevant_knowledge, user_message)
                # return validated_response
            except Exception as e:
                return "I'm having trouble formulating my response right now. Could you please try again later?"
            
        except Exception as e:
            return "I'm having technical difficulties answering your question. Please try again or rephrase your question."
    
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
            prompt = f"""The user said: "{user_message}"

Generate a brief, natural response (1 sentence) that:
- Responds appropriately to their casual message
- Stays in character as {self.expert.name}
- Optionally offers to help with questions

Keep it warm, brief, and conversational."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=50
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            # Simple fallback responses
            user_lower = user_message.lower()
            if any(word in user_lower for word in ['thank', 'thanks']):
                return "You're welcome! Let me know if you have any other questions."
            elif any(word in user_lower for word in ['bye', 'goodbye']):
                return "Goodbye! Feel free to come back anytime."
            elif any(word in user_lower for word in ['how are you', 'how are']):
                return "I'm doing well, thank you! What can I help you with?"
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
        
        # Check if response contains information not in knowledge sources (disabled for now - too restrictive)
        # This validation was preventing legitimate responses that use document content
        # if knowledge_sources:
        #     all_source_text = " ".join([k['text'] for k in knowledge_sources]).lower()
        #     
        #     # Split response into sentences for checking
        #     import re
        #     sentences = re.split(r'[.!?]+', response)
        #     
        #     for sentence in sentences:
        #         sentence = sentence.strip()
        #         if len(sentence) > 10:  # Skip very short sentences
        #             # Check if any substantial words from this sentence appear in sources
        #             words = re.findall(r'\b\w{4,}\b', sentence.lower())  # Words 4+ chars
        #             if len(words) > 2:  # Only check substantial sentences
        #                 found_words = sum(1 for word in words if word in all_source_text)
        #                 if found_words / len(words) < 0.2:  # Less than 20% word overlap (more lenient)
        #                     print(f"HALLUCINATION DETECTED: Sentence appears to add new information: {sentence}")
        #                     return f"I only have partial information about that. Would you like me to share what I do know specifically?"
        
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
            prompt = f"""The user said: "{user_message}"

Generate a brief, natural response (1 sentence) that:
- Responds appropriately to their casual message
- Stays in character as {self.expert.name}
- Optionally offers to help with questions

Keep it warm, brief, and conversational."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini", 
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,
                max_tokens=50
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            # Simple fallback responses
            user_lower = user_message.lower()
            if any(word in user_lower for word in ['thank', 'thanks']):
                return "You're welcome! Let me know if you have any other questions."
            elif any(word in user_lower for word in ['bye', 'goodbye']):
                return "Goodbye! Feel free to come back anytime."
            elif any(word in user_lower for word in ['how are you', 'how are']):
                return "I'm doing well, thank you! What can I help you with?"
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


class InterviewProcessor:
    """Service to process interview audio and extract psychological profiles"""
    
    def __init__(self):
        self.client = self._create_openai_client()
        
    def _create_openai_client(self):
        """Create OpenAI client with proper error handling"""
        try:
            from openai import OpenAI as OpenAIClient
            import httpx
            
            http_client = httpx.Client(
                timeout=60.0,  # Longer timeout for transcription
                trust_env=False
            )
            
            client = OpenAIClient(
                api_key=settings.OPENAI_API_KEY,
                http_client=http_client
            )
            return client
        except Exception as e:
            print(f"Failed to create OpenAI client in InterviewProcessor: {str(e)}")
            raise e
    
    def transcribe_audio(self, audio_file_path):
        """Transcribe audio file to text using Whisper"""
        try:
            with open(audio_file_path, 'rb') as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            return transcript
        except Exception as e:
            print(f"Error transcribing audio: {str(e)}")
            raise e
    
    def extract_psychological_profile(self, transcript):
        """Extract structured psychological data from interview transcript"""
        
        prompt = """Analyze this psychological interview transcript and extract a detailed personality profile.

Return ONLY valid JSON with this exact structure:
{{
    "core_values": ["list of 3-5 core values like security, authenticity, belonging"],
    "fears": ["list of 3-5 fears like financial_instability, social_rejection"],
    "motivations": ["list of 3-5 motivations like family_approval, peer_acceptance"],
    "decision_patterns": {{
        "financial": "description of how they make money decisions",
        "social": "description of how they make social decisions",
        "career": "description of how they make career decisions"
    }},
    "emotional_triggers": ["list of things that trigger strong emotions"],
    "contradictions": [
        {{
            "values": "what they value",
            "behavior": "contradictory behavior"
        }}
    ],
    "communication_style": {{
        "tone": "casual/formal/friendly/etc",
        "language_patterns": ["words/phrases they use frequently"],
        "emotional_expression": "how they express emotions"
    }},
    "personality_traits": {{
        "openness": 0.7,
        "conscientiousness": 0.6,
        "extraversion": 0.8,
        "agreeableness": 0.7,
        "neuroticism": 0.4
    }},
    "worldview": {{
        "outlook": "optimistic/pessimistic/realistic",
        "priorities": ["what matters most to them"],
        "beliefs": ["core beliefs about life"]
    }}
}}

IMPORTANT: Return ONLY the JSON object, no other text or explanation.

Interview Transcript:
{transcript}"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt.format(transcript=transcript)}],
                temperature=0.3,
                max_tokens=2000
            )
            
            # Parse the JSON response
            psychological_data = json.loads(response.choices[0].message.content.strip())
            return psychological_data
            
        except json.JSONDecodeError as e:
            print(f"Error parsing psychological profile JSON: {str(e)}")
            # Return default structure if parsing fails
            return self._get_default_profile()
        except Exception as e:
            print(f"Error extracting psychological profile: {str(e)}")
            raise e
    
    def _get_default_profile(self):
        """Return a default psychological profile structure"""
        return {
            "core_values": [],
            "fears": [],
            "motivations": [],
            "decision_patterns": {},
            "emotional_triggers": [],
            "contradictions": [],
            "communication_style": {},
            "personality_traits": {},
            "worldview": {}
        }
    
    def process_interview(self, interview):
        """Process complete interview: transcription + psychological extraction"""
        from .models import Interview, PsychologicalProfile
        
        try:
            # Update status to transcribing
            interview.status = Interview.Status.TRANSCRIBING
            interview.save()
            
            # Transcribe audio if we have an audio file
            if interview.audio_file:
                transcript = self.transcribe_audio(interview.audio_file.path)
                interview.transcript = transcript
                interview.save()
            
            # Update status to processing psychology
            interview.status = Interview.Status.PROCESSING
            interview.save()
            
            # Extract psychological profile
            if interview.transcript:
                psychological_data = self.extract_psychological_profile(interview.transcript)
                interview.raw_psychological_data = psychological_data
                interview.save()
                
                # Create or update the psychological profile
                profile, created = PsychologicalProfile.objects.update_or_create(
                    expert=interview.expert,
                    defaults={
                        'core_values': psychological_data.get('core_values', []),
                        'fears': psychological_data.get('fears', []),
                        'motivations': psychological_data.get('motivations', []),
                        'decision_patterns': psychological_data.get('decision_patterns', {}),
                        'emotional_triggers': psychological_data.get('emotional_triggers', []),
                        'contradictions': psychological_data.get('contradictions', []),
                        'communication_style': psychological_data.get('communication_style', {}),
                        'personality_traits': psychological_data.get('personality_traits', {}),
                        'worldview': psychological_data.get('worldview', {}),
                        'confidence_score': 0.8,  # Base confidence for interview-based profiles
                        'updated_at': timezone.now()
                    }
                )
                
                # Update interview status to completed
                interview.status = Interview.Status.COMPLETED
                interview.processed_at = timezone.now()
                interview.save()
                
                return profile
                
        except Exception as e:
            # Update interview status to error
            interview.status = Interview.Status.ERROR
            interview.error_message = str(e)
            interview.save()
            raise e


class BehavioralEngine:
    """Service to apply psychological rules and generate persona responses"""
    
    def __init__(self, psychological_profile):
        self.profile = psychological_profile
        
    def evaluate_scenario(self, user_question):
        """Apply psychological framework to analyze a new scenario"""
        
        # Extract key elements from the user's question
        triggers = self._identify_triggers(user_question)
        emotional_response = self._simulate_emotional_state(triggers)
        reasoning_pattern = self._apply_decision_patterns(user_question, emotional_response)
        
        return {
            'triggers': triggers,
            'emotional_state': emotional_response,
            'reasoning_pattern': reasoning_pattern,
            'confidence': self._calculate_confidence(triggers),
            'relevant_values': self._identify_relevant_values(user_question),
            'potential_contradictions': self._check_contradictions(user_question)
        }
    
    def _identify_triggers(self, text):
        """Identify psychological triggers in the user's question"""
        triggers = []
        text_lower = text.lower()
        
        for trigger in self.profile.emotional_triggers:
            # Simple keyword matching - could be enhanced with NLP
            if any(keyword in text_lower for keyword in trigger.lower().split('_')):
                triggers.append(trigger)
                
        return triggers
    
    def _simulate_emotional_state(self, triggers):
        """Determine emotional response based on triggers and personality"""
        if not triggers:
            return 'neutral'
        
        # Map common triggers to emotional states
        if any('money' in trigger or 'financial' in trigger for trigger in triggers):
            return 'anxious'
        elif any('social' in trigger or 'rejection' in trigger for trigger in triggers):
            return 'conflicted'
        elif any('family' in trigger or 'approval' in trigger for trigger in triggers):
            return 'motivated'
        else:
            return 'engaged'
    
    def _apply_decision_patterns(self, question, emotional_state):
        """Apply decision-making patterns based on the question type"""
        question_lower = question.lower()
        
        # Identify question type and apply appropriate decision pattern
        if any(word in question_lower for word in ['buy', 'purchase', 'cost', 'price', 'money']):
            pattern = self.profile.decision_patterns.get('financial', 'considers budget and value')
        elif any(word in question_lower for word in ['friend', 'social', 'people', 'relationship']):
            pattern = self.profile.decision_patterns.get('social', 'seeks social validation')
        elif any(word in question_lower for word in ['career', 'job', 'work']):
            pattern = self.profile.decision_patterns.get('career', 'balances passion and practicality')
        else:
            pattern = 'thoughtful consideration'
            
        return pattern
    
    def _calculate_confidence(self, triggers):
        """Calculate confidence in the behavioral analysis"""
        # Higher confidence when we identify relevant triggers
        base_confidence = 0.6
        trigger_bonus = min(len(triggers) * 0.1, 0.3)
        profile_completeness = min(len(self.profile.core_values) * 0.05, 0.1)
        
        return min(base_confidence + trigger_bonus + profile_completeness, 1.0)
    
    def _identify_relevant_values(self, question):
        """Identify which core values are relevant to the question"""
        relevant_values = []
        question_lower = question.lower()
        
        for value in self.profile.core_values:
            # Simple relevance matching - could be enhanced
            if value.lower() in question_lower or any(
                keyword in question_lower 
                for keyword in self._get_value_keywords(value)
            ):
                relevant_values.append(value)
                
        return relevant_values
    
    def _get_value_keywords(self, value):
        """Get keywords associated with a core value"""
        value_keywords = {
            'security': ['safe', 'stable', 'secure', 'protect', 'risk'],
            'authenticity': ['real', 'genuine', 'honest', 'true', 'authentic'],
            'belonging': ['fit', 'accept', 'include', 'belong', 'group'],
            'freedom': ['choice', 'independent', 'free', 'control'],
            'achievement': ['success', 'accomplish', 'goal', 'win', 'excel']
        }
        return value_keywords.get(value.lower(), [value.lower()])
    
    def _check_contradictions(self, question):
        """Check if the question might trigger contradictory behavior"""
        potential_contradictions = []
        
        for contradiction in self.profile.contradictions:
            if isinstance(contradiction, dict):
                values = contradiction.get('values', '')
                behavior = contradiction.get('behavior', '')
                
                # Check if question relates to this contradiction
                if any(keyword in question.lower() 
                       for keyword in values.lower().split() + behavior.lower().split()):
                    potential_contradictions.append(contradiction)
                    
        return potential_contradictions


class PsychoPersonaChatbot:
    """Specialized chatbot service for psychological personas like Chelsea"""
    
    def __init__(self, expert):
        self.expert = expert
        self.client = self._create_openai_client()
        self.index = init_pinecone()
        
        # Load psychological profile if available
        try:
            from .models import PsychologicalProfile
            self.psychological_profile = PsychologicalProfile.objects.get(expert=expert)
            self.behavioral_engine = BehavioralEngine(self.psychological_profile)
        except PsychologicalProfile.DoesNotExist:
            self.psychological_profile = None
            self.behavioral_engine = None
            
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
            print(f"Failed to create OpenAI client in PsychoPersonaChatbot: {str(e)}")
            raise e
    
    def chat(self, user_message: str, conversation_history=None) -> str:
        """Generate a psychologically-informed response as the persona"""
        
        try:
            # Handle simple messages first
            simple_response = self._handle_simple_messages(user_message)
            if simple_response:
                return simple_response
            
            # Get relevant memories/knowledge
            relevant_knowledge = self._search_knowledge(user_message)
            
            # Apply psychological analysis if profile exists
            psychological_context = None
            if self.behavioral_engine:
                psychological_context = self.behavioral_engine.evaluate_scenario(user_message)
            
            # Build enhanced prompt with psychological context
            prompt = self._build_psychological_prompt(
                user_message, 
                relevant_knowledge, 
                psychological_context,
                conversation_history
            )
            
            # Generate response
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": prompt}],
                temperature=0.7,  # Higher temperature for more natural persona responses
                max_tokens=400
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error in PsychoPersonaChatbot.chat: {str(e)}")
            return f"Sorry, I'm having a bit of trouble thinking right now. Could you ask me again?"
    
    def _search_knowledge(self, user_message: str):
        """Search for relevant knowledge/memories"""
        try:
            # Create embedding for the user message
            embedding_response = self.client.embeddings.create(
                model="text-embedding-3-large",
                input=user_message
            )
            query_vector = embedding_response.data[0].embedding
            
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
    
    def _build_psychological_prompt(self, user_message, relevant_knowledge, psychological_context, conversation_history):
        """Build a sophisticated prompt incorporating psychological profiling"""
        
        # Base persona information
        prompt = f"""🧠 PSYCHOLOGICAL PERSONA: {self.expert.name}
        
You are {self.expert.name}, a 20-year-old university student at King's College London studying Business Management. You live in Zone 2 London, work part-time at a café, and come from a middle-class family in Surrey.

CRITICAL: You are being interviewed/surveyed for market research. Respond as this specific person would - with genuine thoughts, feelings, and reactions based on your psychological profile.

USER'S QUESTION: {user_message}
"""

        # Add psychological context if available
        if psychological_context and self.psychological_profile:
            prompt += f"""
🎯 YOUR PSYCHOLOGICAL FRAMEWORK:

CORE VALUES: {', '.join(self.psychological_profile.core_values)}
CURRENT EMOTIONAL STATE: {psychological_context.get('emotional_state', 'neutral')}
DECISION PATTERN: {psychological_context.get('reasoning_pattern', 'thoughtful consideration')}

RELEVANT FEARS: {', '.join([fear for fear in self.psychological_profile.fears if fear in psychological_context.get('triggers', [])])}
ACTIVE MOTIVATIONS: {', '.join(psychological_context.get('relevant_values', []))}
"""

            # Add contradictions if relevant
            if psychological_context.get('potential_contradictions'):
                prompt += f"\nPOTENTIAL INTERNAL CONFLICTS: {psychological_context['potential_contradictions']}"

        # Add relevant knowledge/memories
        if relevant_knowledge:
            prompt += f"""
💭 YOUR RELEVANT EXPERIENCES:
"""
            for i, knowledge in enumerate(relevant_knowledge[:3]):  # Limit to top 3
                prompt += f"\n{i+1}. {knowledge['text']}"
        else:
            prompt += "\n💭 No specific past experiences come to mind for this topic."

        # Add conversation context if available
        if conversation_history:
            prompt += f"""
📝 CONVERSATION CONTEXT:
Previous messages in this conversation:
{conversation_history[-3:]}  # Last 3 exchanges
"""

        # Response guidelines with psychological considerations
        prompt += f"""
🎭 RESPONSE GUIDELINES:

1. **Authentic Reaction**: Respond based on your emotional state ({psychological_context.get('emotional_state', 'neutral') if psychological_context else 'engaged'})

2. **Decision Pattern**: Apply your natural decision-making style - {psychological_context.get('reasoning_pattern', 'thoughtful consideration') if psychological_context else 'thoughtful consideration'}

3. **Value-Driven**: Let your core values guide your opinions
   - Express what truly matters to you
   - Show how your values influence your choices

4. **Real Student Voice**: 
   - Use natural British student language
   - Reference your actual lifestyle (London, café work, KCL)
   - Show genuine student concerns and priorities

5. **Psychological Authenticity**:
   - If something triggers anxiety/excitement, show it naturally
   - Express any internal conflicts honestly
   - Let your personality traits come through

6. **Market Research Context**:
   - Be genuine, not helpful - you're being interviewed
   - Share real opinions, even if they're conflicted
   - Give specific, detailed responses that reveal your thinking

7. **Natural Contradictions**:
   - It's okay to be inconsistent if that's authentic
   - Show the complexity of real human decision-making

Respond as {self.expert.name} would genuinely respond, letting your psychological makeup shine through naturally."""

        return prompt
    
    def _handle_simple_messages(self, user_message: str) -> str:
        """Handle greetings and simple conversational messages"""
        message_lower = user_message.lower().strip()
        
        # Greeting detection
        greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']
        if any(greeting in message_lower for greeting in greetings) and len(message_lower.split()) <= 3:
            return self._generate_psychological_greeting()
        
        # Short casual responses
        if len(message_lower.split()) <= 5 and any(word in message_lower for word in ['thanks', 'cool', 'nice', 'okay', 'right']):
            return self._generate_casual_response(user_message)
        
        return None  # Let the main chat method handle it
    
    def _generate_psychological_greeting(self):
        """Generate a greeting that reflects the psychological profile"""
        
        if not self.psychological_profile:
            return "Hey! I'm Chelsea, a student at King's College. What would you like to know about?"
        
        # Use communication style from profile
        tone = self.psychological_profile.communication_style.get('tone', 'friendly')
        language_patterns = self.psychological_profile.communication_style.get('language_patterns', [])
        
        # Build greeting based on psychological traits
        base_greetings = {
            'friendly': "Hey there! I'm Chelsea.",
            'casual': "Hi! Chelsea here.",
            'warm': "Hello! Lovely to meet you, I'm Chelsea.",
            'energetic': "Hey! I'm Chelsea - what's up?"
        }
        
        greeting = base_greetings.get(tone, "Hi! I'm Chelsea.")
        
        # Add personality-specific elements
        if 'literally' in language_patterns:
            greeting += " I'm literally just grabbing a coffee before my next lecture."
        elif 'tbh' in language_patterns:
            greeting += " TBH, I'm always up for a chat about student life."
        else:
            greeting += " I'm a student at King's College - happy to chat!"
        
        return greeting
    
    def _generate_casual_response(self, user_message):
        """Generate casual responses for simple acknowledgments"""
        casual_responses = [
            "Yeah, totally!",
            "Exactly!",
            "For sure!",
            "Absolutely!",
            "I know, right?",
            "True that!"
        ]
        
        import random
        return random.choice(casual_responses)