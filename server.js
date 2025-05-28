const http = require('http');

// Port to listen on
const PORT = process.env.PORT || 8000;

console.log(`Starting server with PORT=${PORT} and NODE_ENV=${process.env.NODE_ENV}`);
console.log('Server process ID:', process.pid);
console.log('Current directory:', process.cwd());
console.log('Environment variables:', Object.keys(process.env).sort());

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

// Create the server
const server = http.createServer((req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Log all requests
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);

  // Route handling
  const url = req.url;

  // Health check endpoint
  if (url === '/health' || url === '/health/') {
    console.log('Health check request received');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Public experts endpoint
  if (url === '/api/public-experts' || url === '/api/public-experts/') {
    console.log('Public experts request received');
    res.statusCode = 200;
    res.end(JSON.stringify(experts));
    return;
  }

  // Experts endpoint
  if (url === '/api/experts' || url === '/api/experts/') {
    console.log('Experts request received');
    res.statusCode = 200;
    res.end(JSON.stringify(experts));
    return;
  }

  // Default route
  if (url === '/' || url === '') {
    console.log('Root request received');
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      message: 'ExpertA API is running',
      endpoints: [
        '/health',
        '/api/public-experts',
        '/api/experts'
      ]
    }));
    return;
  }

  // Not found
  console.log(`Not found: ${url}`);
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Available endpoints: /health, /api/public-experts, /api/experts`);
}); 