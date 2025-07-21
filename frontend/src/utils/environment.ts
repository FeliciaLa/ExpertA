// Environment detection utility
export const isProduction = () => {
  return window.location.hostname === 'duplixai.co.uk' || window.location.hostname === 'www.duplixai.co.uk';
};

export const isStaging = () => {
  return window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost');
};

export const getEnvironment = () => {
  if (isProduction()) return 'production';
  if (isStaging()) return 'staging';
  return 'development';
};

// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'https://experta-backend-d64920064058.herokuapp.com/api/';

// Stripe configuration
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QWC2fKrYN7Hqj3Eq2rGtPONrsZNpVWq2ybZe1b5nGBYa8jJl3qVlQqjxQ8vSAaKyVgON7E2vBJjsQS8fDePr74A00oJ3yPL5c';

// Feature flags
export const features = {
  payments: true, // Enable payments for The Stoic Mentor
  // Add more features here as needed
}; 