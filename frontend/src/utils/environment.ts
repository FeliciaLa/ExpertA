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

// Feature flags
export const features = {
  payments: true, // Enable payments globally
  // Add more features here as needed
}; 