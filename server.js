const http = require('http');

// Port to listen on
const PORT = process.env.PORT || 8000;

console.log(`Starting server on port ${PORT}`);

// Sample expert data
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

// Create a basic HTTP server
http.createServer((req, res) => {
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Simple routing
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  } 
  else if (req.url === '/api/public-experts' || req.url === '/api/public-experts/') {
    res.writeHead(200);
    res.end(JSON.stringify(experts));
  }
  else if (req.url === '/api/experts' || req.url === '/api/experts/') {
    res.writeHead(200);
    res.end(JSON.stringify(experts));
  }
  else if (req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', message: 'ExpertA API is running' }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
}); 