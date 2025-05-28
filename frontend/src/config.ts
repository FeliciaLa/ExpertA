// API Configuration
const apiUrlWithoutTrailingSlash = (import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8999/api' 
    : 'https://experta-production.up.railway.app/api')).replace(/\/$/, '');

// Base URL for API requests - prevent double /api/ in URL
export const API_URL = apiUrlWithoutTrailingSlash.endsWith('/api') 
  ? `${apiUrlWithoutTrailingSlash}/` 
  : `${apiUrlWithoutTrailingSlash}/api/`;

// Debug logging
console.log('API URL environment variable:', import.meta.env.VITE_API_URL);
console.log('Resolved API URL:', API_URL);

// Make sure URLs have correct formatting
export const formatApiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Prevent adding /api/ twice
  if (API_URL.endsWith('/api/') && cleanPath.startsWith('api/')) {
    return `${API_URL}${cleanPath.substring(4)}`;
  }
  
  // Special case for public-experts - use the direct endpoint that has explicit CORS headers
  if (cleanPath === 'public-experts' || cleanPath === 'public-experts/') {
    return `${API_URL}public-experts-direct/`;
  }
  
  return `${API_URL}${cleanPath}`;
};

// Flag to force using mock data until Railway is fixed
export const FORCE_MOCK_DATA = false;

// Mock data for when using JSONPlaceholder
export const MOCK_EXPERTS = [
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

// Standard fetch options with CORS settings
export const fetchOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  credentials: 'omit' as RequestCredentials,
  mode: 'cors' as RequestMode
}; 