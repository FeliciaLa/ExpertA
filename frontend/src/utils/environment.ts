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
// Stripe configuration - should be set as VITE_STRIPE_PUBLISHABLE_KEY environment variable in Vercel
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RXIAQRpcM4BibkQIXnQLc7fn54KwyRSoBlDymXnTNkgxFBx8vmrkFYlekLunyWoE3EIBfIEeBuoUKV71wgGabi300wtZf3UDk';

// Feature flags
export const features = {
  payments: true, // Enable payments for The Stoic Mentor
  browseExperts: true, // Enable browse experts functionality
  // Add more features here as needed
}; 