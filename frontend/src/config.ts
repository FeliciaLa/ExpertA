// API Configuration
const API_URL = (import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8999/api' 
    : 'https://jsonplaceholder.typicode.com')).replace(/\/$/, '') + '/';

// Make sure URLs have correct formatting
export const formatApiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}${cleanPath}`;
};

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

export { API_URL }; 