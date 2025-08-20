# DuplixAI - AI-Powered Expert Digital Twins

DuplixAI is a self-service platform that enables professionals to create and share AI-powered digital twins of themselves. By combining interactive Q&A sessions and document uploads, experts can train chatbots that deliver personalized, grounded responses based on their own knowledge.

## Live Demo

**Try DuplixAI:** https://duplixai.co.uk

## Project Overview

DuplixAI transforms individual expertise into always-accessible, intelligent resources under the expert's direct control. The system demonstrates how real-world expertise can be digitized, structured, and deployed for independent distribution.

## Key Features

- **Expert Onboarding:** Structured profile creation and knowledge mapping
- **Interactive Training:** Dynamic Q&A sessions and document uploads
- **RAG Architecture:** Retrieval-Augmented Generation for grounded responses
- **Anti-Hallucination:** Emergency protocol and confidence scoring
- **Shareable Links:** Secure access to AI twins
- **Real-time Chat:** Instant expert knowledge access

## Technical Architecture

### Frontend
- React 18 + TypeScript
- Material-UI (MUI v5)
- Vercel deployment

### Backend
- Django + Django REST Framework
- PostgreSQL database
- Heroku deployment

### AI Layer
- OpenAI GPT-4o for response generation
- Pinecone vector database for semantic search
- RAG architecture with confidence scoring
- Multi-layer validation pipeline

## Setup Instructions

### Backend Setup
1. Navigate to backend directory
2. Create virtual environment: `python -m venv venv`
3. Install dependencies: `pip install -r requirements.txt`
4. Set up environment variables (OpenAI, Pinecone API keys)
5. Run migrations: `python manage.py migrate`
6. Start server: `python manage.py runserver`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Research & Evaluation

This project includes comprehensive user testing and RAG evaluation:
- **3 rounds of usability testing** with domain experts
- **RAG performance benchmarking** (0% hallucinations, 26% faster responses)
- **Technical validation** of anti-hallucination mechanisms

## Repository Structure
