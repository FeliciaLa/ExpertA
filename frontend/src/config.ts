// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8999/api' 
    : 'https://experta-production.up.railway.app/api');

export { API_URL }; 