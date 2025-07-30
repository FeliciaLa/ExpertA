# Chelsea Persona Creation Roadmap

## Phase 1: Setup & Data Collection (Week 1-2)

### Step 1: Environment Setup
```bash
# Create project structure
mkdir chelsea-persona
cd chelsea-persona
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install praw openai pandas numpy scikit-learn python-dotenv tqdm
```

### Step 2: API Credentials
- Reddit API: Create app at https://www.reddit.com/prefs/apps/
- OpenAI API: Get key from https://platform.openai.com/
- Store in `.env` file (never commit this!)

### Step 3: Data Collection Pipeline
- Target subreddits: UniUK, london, UKPersonalFinance, CasualUK, BritishProblems
- Collect ~5,000 relevant posts
- Immediate anonymization
- Focus on posts matching "student in London" criteria

## Phase 2: Knowledge Base Creation (Week 2-3)

### Step 4: Data Processing
- Clean and filter collected posts
- Extract language patterns and themes
- Generate embeddings for semantic search
- Store in structured format (JSON/SQLite)

### Step 5: Relevance Scoring
- Create scoring system for "Chelsea-like" content
- Filter by age indicators, location, financial situation
- Rank posts by relevance to persona

## Phase 3: RAG Implementation (Week 3-4)

### Step 6: Search System
- Implement semantic search using embeddings
- Create query-to-knowledge matching
- Build context selection for GPT prompts

### Step 7: Response Generation
- Design Chelsea persona prompts
- Implement GPT-4 response generation
- Create conversation flow management

## Phase 4: Testing & Refinement (Week 4-5)

### Step 8: Validation
- Build simple chat interface
- Test responses for authenticity
- Refine prompts and knowledge base
- Validate against real student feedback (optional)

## Expected Costs
- Setup: £200-500
- Monthly: £70-130 (APIs + hosting)
- Time: 4-5 weeks part-time

## Success Metrics
- 70%+ authentic-sounding responses
- Consistent personality across conversations
- Appropriate use of student/London slang
- Realistic financial concerns and lifestyle references