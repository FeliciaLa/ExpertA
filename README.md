# DuplixAI - AI-Powered Expert Digital Twins

**Academic Research Project - MSc Computing and Information Systems**

This repository contains the complete implementation of DuplixAI, a self-service platform that enables professionals to create and share AI-powered digital twins of themselves. The system demonstrates Retrieval-Augmented Generation (RAG) architecture for grounded, hallucination-free AI responses.

## �� Live Application

**Try DuplixAI:** https://duplixai.co.uk

## Repository Guide for Reviewers

### Core Implementation Files

#### Backend (Django)
- **`backend/api/models.py`** - Database models for users, experts, knowledge bases, and training data
- **`backend/api/services.py`** - Core RAG implementation, ExpertChatbot service, and prompt engineering
- **`backend/api/views.py`** - API endpoints for training, chat, and user management
- **`backend/api/urls.py`** - URL routing configuration

#### Frontend (React/TypeScript)
- **`frontend/src/components/`** - React components for expert onboarding, training, and chat interface
- **`frontend/src/pages/`** - Main application pages and routing
- **`frontend/src/services/`** - API service layer and authentication

#### Key Technical Files
- **`backend/api/services.py`** - Contains the RAG prompt template and anti-hallucination mechanisms
- **`backend/api/views.py`** - Implements the chat endpoint with expert lookup and validation
- **`frontend/src/components/Chat.tsx`** - Main chat interface implementation

### Research & Evaluation Data

- **User Testing Results** - Comprehensive usability evaluation across 3 rounds
- **RAG Performance Metrics** - Hallucination rates, response times, and groundedness scores
- **Technical Validation** - Anti-hallucination protocol effectiveness

### Architecture Overview

- **RAG Implementation** - Vector embedding, semantic search, and response generation
- **Anti-Hallucination System** - Emergency protocol, confidence scoring, and validation
- **Expert Isolation** - Secure, separated knowledge bases for each expert
- **Production Deployment** - Heroku backend, Vercel frontend, Pinecone vector database

### Key Technical Contributions

1. **Multi-layered Prompt Engineering** - Emergency protocol and knowledge boundary enforcement
2. **Confidence-based Knowledge Retrieval** - Semantic similarity with configurable thresholds
3. **Comprehensive Validation Pipeline** - Phrase detection and secondary AI verification
4. **Expert-specific Knowledge Isolation** - Secure data separation and access control

## Setup for Local Development

*Note: This is for code review purposes. The live application is hosted at https://duplixai.co.uk*

### Backend Setup
1. Navigate to `backend/` directory
2. Install dependencies: `pip install -r requirements.txt`
3. Set up environment variables (OpenAI, Pinecone API keys)
4. Run migrations: `python manage.py migrate`
5. Start server: `python manage.py runserver`

### Frontend Setup
1. Navigate to `frontend/` directory
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Dissertation Submission

This repository accompanies the dissertation "DuplixAI: Building an AI Powered, Self-Service Platform for Human Digital Twin Creation" submitted for MSc Computing and Information Systems.