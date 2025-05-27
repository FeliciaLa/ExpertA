from django.conf import settings
from django.utils import timezone
from openai import OpenAI
from .pinecone_utils import init_pinecone
import uuid

class KnowledgeTrainer:
    """Handles continuous knowledge training for experts."""
    
    def __init__(self, expert):
        self.expert = expert
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.index = init_pinecone()

    def get_next_question(self):
        """Generate the next question based on current knowledge state."""
        try:
            # Determine which type of question to generate
            if self.expert.total_questions_answered < 50:
                return self._generate_structured_question()
            else:
                return self._generate_gap_question()
        except Exception as e:
            print(f"Error generating next question: {str(e)}")
            return None

    def submit_answer(self, question_id, answer):
        """Process a submitted answer and update knowledge state."""
        try:
            # Store Q&A in Pinecone
            success = self._store_qa_in_pinecone(question_id, answer)
            if success:
                # Update expert's progress
                self.expert.total_questions_answered += 1
                self.expert.last_training_at = timezone.now()
                self.expert.save()
                
                # Update knowledge areas
                self._update_knowledge_areas()
                return True
            return False
        except Exception as e:
            print(f"Error submitting answer: {str(e)}")
            return False

    def _analyze_current_knowledge(self):
        """Analyze the expert's current knowledge state."""
        try:
            # Query all knowledge entries for this expert
            results = self.index.query(
                vector=[0] * 1024,  # dummy vector
                filter={"expert_id": str(self.expert.id)},
                top_k=1000,
                include_metadata=True
            )

            # Extract topics and analyze coverage
            topics = {}
            for match in results.matches:
                topic = match.metadata.get('topic', 'General')
                topics[topic] = topics.get(topic, 0) + match.score

            # Identify well-covered topics and gaps
            well_covered = [t for t, s in topics.items() if s > 0.7]
            gaps = [t for t, s in topics.items() if s < 0.3]

            return {
                "topics": topics,
                "well_covered": well_covered,
                "gaps": gaps
            }
        except Exception as e:
            print(f"Error analyzing knowledge: {str(e)}")
            return {"topics": {}, "well_covered": [], "gaps": []}

    def _generate_structured_question(self):
        """Generate a structured question for the initial phase."""
        try:
            # Get the current phase based on questions answered
            phase_index = min(self.expert.total_questions_answered // 10, 4)
            phases = ["Background", "Principles", "Expertise", "Applications", "Insights"]
            current_phase = phases[phase_index]

            # Generate question using OpenAI
            prompt = f"""Generate a detailed question about {current_phase} for an expert in their field.
            Previous answers: {self.expert.total_questions_answered} questions answered.
            Focus on: {current_phase}
            Make it specific and thought-provoking."""

            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )

            question_text = response.choices[0].message.content.strip()
            return {
                "id": str(uuid.uuid4()),
                "text": question_text,
                "phase": current_phase,
                "topic": current_phase
            }
        except Exception as e:
            print(f"Error generating structured question: {str(e)}")
            return None

    def _generate_gap_question(self):
        """Generate a question targeting knowledge gaps."""
        try:
            # Analyze current knowledge
            knowledge_state = self._analyze_current_knowledge()
            
            # Choose a gap to focus on
            gaps = knowledge_state.get('gaps', [])
            if not gaps:
                # If no clear gaps, focus on deepening existing knowledge
                prompt = "Generate a question that helps deepen the expert's existing knowledge."
                topic = "Knowledge Deepening"
            else:
                gap = gaps[0]  # Take the first gap
                prompt = f"Generate a question about {gap} to fill this knowledge gap."
                topic = gap

            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}]
            )

            question_text = response.choices[0].message.content.strip()
            return {
                "id": str(uuid.uuid4()),
                "text": question_text,
                "phase": "Gap Filling",
                "topic": topic
            }
        except Exception as e:
            print(f"Error generating gap question: {str(e)}")
            return None

    def _store_qa_in_pinecone(self, question_id, answer):
        """Store the Q&A pair in Pinecone."""
        try:
            # Generate embedding for the combined Q&A text
            qa_text = f"Question: {question_id}\nAnswer: {answer}"
            embedding_response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=qa_text
            )
            embedding = embedding_response.data[0].embedding[:1024]

            # Store in Pinecone
            self.index.upsert(
                vectors=[{
                    "id": str(uuid.uuid4()),
                    "values": embedding,
                    "metadata": {
                        "expert_id": str(self.expert.id),
                        "question_id": question_id,
                        "text": qa_text,
                        "created_at": str(timezone.now()),
                        "source": "Training Session"
                    }
                }]
            )
            return True
        except Exception as e:
            print(f"Error storing Q&A in Pinecone: {str(e)}")
            return False

    def _update_knowledge_areas(self):
        """Update the expert's knowledge areas based on recent training."""
        try:
            knowledge_state = self._analyze_current_knowledge()
            self.expert.knowledge_areas = {
                "topics": list(knowledge_state["topics"].keys()),
                "well_covered": knowledge_state["well_covered"],
                "gaps": knowledge_state["gaps"]
            }
            self.expert.save()
        except Exception as e:
            print(f"Error updating knowledge areas: {str(e)}") 