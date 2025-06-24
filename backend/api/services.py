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
                    max_tokens=100,   # Even shorter to prevent elaboration
                    top_p=0.9,        # Focus on most likely tokens
                    frequency_penalty=0.2  # Discourage repetitive elaboration
                )
                
                raw_response = response.choices[0].message.content
                
                # Validate response doesn't contain hallucinations
                validated_response = self._validate_response(raw_response, relevant_knowledge, user_message)
                return validated_response
            except Exception as e:
                return "I'm having trouble formulating my response right now. Could you please try again later?"
            
        except Exception as e:
            return "I'm having technical difficulties answering your question. Please try again or rephrase your question."
    
    def _build_response_prompt(self, expert_profile, knowledge_base, relevant_knowledge, user_message) -> str:
        """Build a detailed prompt for response generation"""
        
        prompt = f"""You are {self.expert.name}, a tech expert. Answer the user's question using the information provided below.

The user is asking: {user_message}

Here is the relevant information from your training and documents:"""
        
        # Add relevant knowledge with clear source boundaries
        if relevant_knowledge:
            sorted_knowledge = sorted(relevant_knowledge, key=lambda x: x['confidence_score'], reverse=True)
            for i, knowledge in enumerate(sorted_knowledge):
                source_label = "MY DIRECT EXPERIENCE" if not knowledge['topic'].startswith('Document:') else "REFERENCE MATERIAL"
                prompt += f"\n\n--- SOURCE {i+1}: {source_label} ---\n{knowledge['text']}\n--- END SOURCE {i+1} ---"
        
        # Add training summary if available
        if knowledge_base and knowledge_base.training_summary:
            prompt += f"\n\n--- MY BACKGROUND ---\n{knowledge_base.training_summary}\n--- END BACKGROUND ---"
        
        prompt += f"""

Based on this information, provide a helpful response about {user_message.lower()}. Use the information above to answer their question naturally."""
        
        return prompt 
    
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