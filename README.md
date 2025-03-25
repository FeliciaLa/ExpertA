# ExpertA - AI Expert System

An AI-powered expert system that uses embeddings and vector search to provide intelligent responses based on domain knowledge.

## Project Structure

```
ExpertA/
├── backend/           # Django backend
│   ├── api/          # Django app with views, models, and utils
│   ├── expert_system/# Django project settings
│   ├── manage.py     # Django management script
│   ├── requirements.txt # Python dependencies
│   └── venv/         # Python virtual environment
├── frontend/         # React frontend
│   ├── src/          # Source code
│   ├── public/       # Static files
│   └── package.json  # Node.js dependencies
├── .env             # Environment variables
└── .gitignore       # Git ignore file
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add required API keys:
     ```
     OPENAI_API_KEY=your_openai_api_key
     PINECONE_API_KEY=your_pinecone_api_key
     ```

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Features

- Knowledge input through expert form
- Vector-based knowledge storage using Pinecone
- Intelligent question answering using OpenAI
- Real-time chat interface
- Knowledge management interface

## Technologies Used

- **Frontend:**
  - React with TypeScript
  - Material-UI
  - Vite
  - Axios

- **Backend:**
  - Django
  - Django REST Framework
  - OpenAI API
  - Pinecone Vector Database

## Development

- Frontend code is in TypeScript with React
- Backend uses Django with Python
- API documentation available at `/api/docs/`
- Use `npm run build` to create production frontend build

## API Endpoints

### Training Endpoint
- URL: `POST /api/train/`
- Purpose: For experts to input knowledge into the system
- Authentication: Required

### Chat Endpoint
- URL: `POST /api/chat/`
- Purpose: For users to interact with the AI expert system
- Authentication: Required 