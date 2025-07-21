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
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RXIAbRpY4U21STtgQXyGy0DyClPih7SYhbD4Q2fLKCbIdwSxCqfRjedFs0G7H4mKSIsS3lEWgcvLkN36dg2wJbP00uTRgBLRp';

// Feature flags
export const features = {
  payments: true, // Enable payments for The Stoic Mentor
  // Add more features here as needed
}; 