// API Configuration - Always use local backend for now until Railway is fixed
const API_URL = 'http://localhost:8999/api/';

// Make sure URLs have correct formatting
export const formatApiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}${cleanPath}`;
};

export { API_URL }; 