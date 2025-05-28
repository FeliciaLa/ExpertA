const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8000;

// Sample expert data based on your real data
const experts = [
  {
    id: "3ce3731a-cc37-4fd8-a3e2-ec34dc8b83b2",
    name: "Flu1",
    email: "f@lu1.com",
    specialties: "Methodologies and Tools",
    bio: "Marketing expert bio",
    title: "Marketing expert",
    profile_image: null
  },
  {
    id: "a3823504-6333-487a-9b31-e1ee24bebb11",
    name: "fla1",
    email: "f@la.com",
    specialties: "",
    bio: "",
    title: "",
    profile_image: null
  }
];

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.json({ status: 'ok' });
});

// Public experts endpoint
app.get('/api/public-experts', (req, res) => {
  console.log('Public experts request received');
  res.json(experts);
});

// Also support trailing slash
app.get('/api/public-experts/', (req, res) => {
  console.log('Public experts request received (with trailing slash)');
  res.json(experts);
});

// Experts endpoint
app.get('/api/experts', (req, res) => {
  console.log('Experts request received');
  res.json(experts);
});

// Also support trailing slash
app.get('/api/experts/', (req, res) => {
  console.log('Experts request received (with trailing slash)');
  res.json(experts);
});

// Default route
app.get('/', (req, res) => {
  console.log('Root request received');
  res.json({ 
    status: 'ok', 
    message: 'ExpertA API is running',
    endpoints: [
      '/health',
      '/api/public-experts',
      '/api/experts'
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 