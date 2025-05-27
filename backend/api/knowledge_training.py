from django.utils import timezone
from openai import OpenAI
from django.conf import settings
from .models import Expert, TrainingQuestion
from .pinecone_utils import init_pinecone
import json

class KnowledgeTrainer:
    """Service for continuous knowledge training"""
    
    def __init__(self, expert: Expert):
        self.expert = expert
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.index = init_pinecone()

    def get_next_question(self) -> dict:
        """Generate the next appropriate question based on current knowledge state"""
        try:
            # Get current knowledge state
            knowledge_state = self._analyze_current_knowledge()
            
            # Get question count and determine phase
            question_count = self.expert.total_questions_answered
            
            if question_count < 50:  # Initial structured phase
                return self._generate_structured_question(question_count, knowledge_state)
            else:  # Gap-filling phase
                return self._generate_gap_question(knowledge_state)
                
        except Exception as e:
            print(f"Error generating next question: {str(e)}")
            return None

    def submit_answer(self, question_id: str, answer: str) -> bool:
        """Process a submitted answer and update knowledge state"""
        try:
            # Get the question
            question = TrainingQuestion.objects.get(id=question_id, expert=self.expert)
            
            # Save the answer
            question.answer = answer
            question.answered_at = timezone.now()
            question.save()
            
            # Update expert's progress
            self.expert.total_questions_answered += 1
            self.expert.last_training_at = timezone.now()
            self.expert.save()
            
            # Store in Pinecone
            self._store_qa_in_pinecone(question)
            
            # Update knowledge areas
            self._update_knowledge_areas(question)
            
            return True
        except Exception as e:
            print(f"Error processing answer: {str(e)}")
            return False

    def _analyze_current_knowledge(self) -> dict:
        """Analyze the current state of expert's knowledge"""
        try:
            # Query all knowledge for this expert
            query_response = self.index.query(
                vector=[0] * 1024,  # dummy vector
                top_k=1000,
                include_metadata=True,
                filter={
                    "expert_id": str(self.expert.id)
                }
            )
            
            # Analyze knowledge entries
            knowledge_entries = [match.metadata for match in query_response.matches]
            
            # Extract and analyze topics
            topics = {}
            for entry in knowledge_entries:
                # Get topics from metadata or extract them
                entry_topics = entry.get('topics', [])
                if not entry_topics:
                    topics_response = self.client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "Extract 2-3 main topics from this text, separated by commas:"},
                            {"role": "user", "content": entry['text']}
                        ],
                        temperature=0.3,
                        max_tokens=50
                    )
                    entry_topics = [t.strip().lower() for t in topics_response.choices[0].message.content.split(',')]
                
                # Update topic coverage
                for topic in entry_topics:
                    if topic in topics:
                        topics[topic]['count'] += 1
                        topics[topic]['entries'].append(entry['text'][:100])
                    else:
                        topics[topic] = {
                            'count': 1,
                            'entries': [entry['text'][:100]]
                        }
            
            return {
                'total_entries': len(knowledge_entries),
                'topics': topics,
                'gaps': [topic for topic, data in topics.items() if data['count'] < 3],
                'well_covered': [topic for topic, data in topics.items() if data['count'] >= 5]
            }
            
        except Exception as e:
            print(f"Error analyzing knowledge: {str(e)}")
            return {}

    def _generate_structured_question(self, question_count: int, knowledge_state: dict) -> dict:
        """Generate a question for the structured phase"""
        try:
            # Define phases
            phases = [
                ("Background", "Ask about their general experience, education, and journey."),
                ("Principles", "Explore their fundamental principles and methodologies."),
                ("Expertise", "Deep dive into their specific areas of expertise."),
                ("Applications", "Focus on practical applications and examples."),
                ("Insights", "Extract unique insights and professional tips.")
            ]
            
            # Determine current phase
            phase_index = min(question_count // 10, 4)
            current_phase, phase_description = phases[phase_index]
            
            # Get recent context
            recent_qa = TrainingQuestion.objects.filter(
                expert=self.expert,
                answer__isnull=False
            ).order_by('-created_at')[:3]
            
            context = "\n".join([
                f"Q: {qa.question}\nA: {qa.answer}"
                for qa in recent_qa
            ])
            
            # Generate question
            prompt = f"""You are an expert interviewer conducting a knowledge extraction interview.
Current phase ({question_count}/50): {current_phase}
Phase goal: {phase_description}

Current knowledge state:
- Total entries: {knowledge_state['total_entries']}
- Well-covered topics: {', '.join(knowledge_state['well_covered'])}
- Topics needing coverage: {', '.join(knowledge_state['gaps'])}

Guidelines:
1. Generate ONE question that matches the current phase
2. Questions should build upon previous answers when available
3. Focus on extracting practical knowledge and expertise
4. Ask for specific examples and real-world applications
5. Questions should require detailed, comprehensive answers

Previous Q&A context:
{context}"""

            completion = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Generate the next interview question:"}
                ],
                temperature=0.7
            )
            
            question_text = completion.choices[0].message.content.strip()
            
            # Create and return question
            question = TrainingQuestion.objects.create(
                expert=self.expert,
                question=question_text,
                phase=current_phase,
                order=question_count + 1
            )
            
            return {
                'id': question.id,
                'question': question.question,
                'phase': question.phase,
                'order': question.order
            }
            
        except Exception as e:
            print(f"Error generating structured question: {str(e)}")
            return None

    def _generate_gap_question(self, knowledge_state: dict) -> dict:
        """Generate a question targeting knowledge gaps"""
        try:
            # Get recent context
            recent_qa = TrainingQuestion.objects.filter(
                expert=self.expert,
                answer__isnull=False
            ).order_by('-created_at')[:3]
            
            context = "\n".join([
                f"Q: {qa.question}\nA: {qa.answer}"
                for qa in recent_qa
            ])
            
            # Create prompt for gap-filling question
            prompt = f"""You are an expert interviewer conducting a knowledge extraction interview.
Phase: Gap Analysis (Question {self.expert.total_questions_answered + 1})

Current knowledge state:
- Total entries: {knowledge_state['total_entries']}
- Well-covered topics: {', '.join(knowledge_state['well_covered'])}
- Topics needing more coverage: {', '.join(knowledge_state['gaps'])}

Guidelines:
1. Generate ONE question that targets an identified knowledge gap
2. Focus on areas with minimal coverage
3. Ask for specific examples and practical applications
4. Questions should require detailed, comprehensive answers

Previous Q&A context:
{context}"""

            completion = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": "Generate a question to fill knowledge gaps:"}
                ],
                temperature=0.7
            )
            
            question_text = completion.choices[0].message.content.strip()
            
            # Create and return question
            question = TrainingQuestion.objects.create(
                expert=self.expert,
                question=question_text,
                phase='Gap Analysis',
                order=self.expert.total_questions_answered + 1
            )
            
            return {
                'id': question.id,
                'question': question.question,
                'phase': question.phase,
                'order': question.order
            }
            
        except Exception as e:
            print(f"Error generating gap question: {str(e)}")
            return None

    def _store_qa_in_pinecone(self, question: TrainingQuestion) -> bool:
        """Store Q&A pair in Pinecone"""
        try:
            # Create combined text
            qa_text = f"Question: {question.question}\nAnswer: {question.answer}"
            
            # Generate embedding
            embedding_response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=qa_text
            )
            embedding = embedding_response.data[0].embedding
            
            # Store in Pinecone
            self.index.upsert(vectors=[{
                'id': str(question.id),
                'values': embedding[:1024],
                'metadata': {
                    'text': qa_text,
                    'created_by': self.expert.username,
                    'created_at': str(timezone.now()),
                    'expert_id': str(self.expert.id),
                    'source': 'Training',
                    'phase': question.phase,
                    'topics': question.topics
                }
            }])
            
            return True
        except Exception as e:
            print(f"Error storing Q&A in Pinecone: {str(e)}")
            return False

    def _update_knowledge_areas(self, question: TrainingQuestion) -> None:
        """Update expert's knowledge areas based on new Q&A"""
        try:
            # Extract topics from Q&A
            topics_response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Extract 2-3 main topics from this Q&A, separated by commas:"},
                    {"role": "user", "content": f"Q: {question.question}\nA: {question.answer}"}
                ],
                temperature=0.3,
                max_tokens=50
            )
            
            topics = [t.strip().lower() for t in topics_response.choices[0].message.content.split(',')]
            
            # Update question topics
            question.topics = topics
            question.save()
            
            # Update expert's knowledge areas
            areas = self.expert.knowledge_areas
            for topic in topics:
                if topic in areas:
                    areas[topic]['count'] += 1
                    areas[topic]['last_updated'] = str(timezone.now())
                else:
                    areas[topic] = {
                        'count': 1,
                        'first_seen': str(timezone.now()),
                        'last_updated': str(timezone.now())
                    }
            
            self.expert.knowledge_areas = areas
            self.expert.save()
            
        except Exception as e:
            print(f"Error updating knowledge areas: {str(e)}") 