import axios, { AxiosError } from 'axios';

// Read API URL from environment variable in production, or use production backend as default
const baseUrl = import.meta.env.VITE_API_URL || 'https://experta-backend-d64920064058.herokuapp.com';

// Handle API URL construction properly to prevent double /api/
let finalApiUrl;
if (baseUrl.includes('/api/')) {
  // If baseUrl already contains /api/, use it as is
  finalApiUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
} else {
  // If baseUrl doesn't contain /api/, add it
  finalApiUrl = baseUrl.endsWith('/') ? `${baseUrl}api/` : `${baseUrl}/api/`;
}

export const API_URL = finalApiUrl;

// Log the API URL being used
console.log('API URL:', API_URL);
console.log('Environment Variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});

// Function to get CSRF token from cookies
function getCsrfToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export interface ExpertProfileData {
  industry: string;
  years_of_experience: number;
  key_skills: string;
  typical_problems: string;
  background: string;
  certifications: string;
  tools_technologies: string;
  monetization_enabled: boolean;
  monetization_price: number;
}

export interface ExpertData {
  id: string;
  email: string;
  name: string;
  first_name?: string; // Legacy field for backward compatibility
  last_name?: string;  // Legacy field for backward compatibility
  bio?: string;
  specialties?: string;
  title?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
  profile_image?: string;
  profile?: ExpertProfileData;
  total_training_messages?: number;
  last_training_at?: string;
  slug?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  tokens: LoginResponse;
  user?: UserData;
  expert?: ExpertData;
  message: string;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  is_expert?: boolean;
  is_user?: boolean;
  profile_image?: string;
  date_joined?: string;
  slug?: string;
}

export interface UserAuthResponse {
  tokens: LoginResponse;
  user: UserData;
  message: string;
}

// Create an instance of axios with the base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // List of endpoints that don't require authentication
    const publicEndpoints = [
      'register/',
      'user/register/',
      'login/',
      'verify-email/',
      'verify-email-change/',
      'public-experts/',
      'password-reset/',
      'password-reset-confirm/',
      'test/'
    ];
    
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    // Check if this is a file upload request (FormData)
    const isFileUpload = config.data instanceof FormData;
    
    // For file uploads, remove the Content-Type header to let the browser set it automatically with the boundary
    if (isFileUpload) {
      delete config.headers['Content-Type'];
      console.log('API Request Interceptor - Removed Content-Type for file upload');
    }
    
    const tokens = localStorage.getItem('tokens');
    console.log('API Request Interceptor - URL:', config.url);
    console.log('API Request Interceptor - Full URL:', `${config.baseURL}${config.url}`);
    console.log('API Request Interceptor - Method:', config.method?.toUpperCase());
    console.log('API Request Interceptor - Is public endpoint:', isPublicEndpoint);
    console.log('API Request Interceptor - Is file upload:', isFileUpload);
    

    
    // Only add auth headers for non-public endpoints
    if (!isPublicEndpoint && tokens) {
      try {
        const parsedTokens = JSON.parse(tokens);
        
        if (parsedTokens && parsedTokens.access) {
          config.headers.Authorization = `Bearer ${parsedTokens.access}`;
          console.log('API Request Interceptor - Added auth token:', `Bearer ${parsedTokens.access.substring(0, 10)}...`);
        } else {
          console.log('API Request Interceptor - No access token found in tokens object', parsedTokens);
        }
      } catch (error) {
        console.error('API Request Interceptor - Error parsing tokens:', error);
        // If token is invalid, clear it
        localStorage.removeItem('tokens');
      }
    } else if (isPublicEndpoint) {
      console.log('API Request Interceptor - Skipping auth for public endpoint');
    } else {
      console.log('API Request Interceptor - No tokens found in localStorage');
    }
    
    console.log('API Request Interceptor - Final headers:', config.headers);
    return config;
  },
  (error) => {
    console.error('API Request Interceptor - Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only attempt refresh once to prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('Unauthorized error caught by interceptor, attempting token refresh...');

      try {
        // Get tokens from localStorage
        const tokensStr = localStorage.getItem('tokens');
        if (!tokensStr) {
          console.error('No tokens in localStorage');
          throw new Error('No refresh token available');
        }

        const tokens = JSON.parse(tokensStr);
        if (!tokens.refresh) {
          console.error('No refresh token in tokens object');
          throw new Error('No refresh token available');
        }

        // Use the unified token refresh endpoint
        const refreshEndpoint = 'token/refresh/';
        console.log('Using refresh endpoint:', refreshEndpoint);

        // Try to refresh the token - use direct axios to avoid interceptor loop
        console.log('Attempting to refresh token with endpoint:', `${API_URL}${refreshEndpoint}`);
        
        const response = await axios({
          method: 'post',
          url: `${API_URL}${refreshEndpoint}`,
          data: { refresh: tokens.refresh },
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.data && response.data.access) {
          const newAccessToken = response.data.access;
          console.log('Token refresh successful, received new access token');
          
          // Update tokens in localStorage
          const updatedTokens = {
            ...tokens,
            access: newAccessToken
          };
          localStorage.setItem('tokens', JSON.stringify(updatedTokens));

          // Update the authorization header in the api instance default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          console.log('Updated default Authorization header with new token');

          // Also update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          // Retry the request with the new token
          console.log('Retrying original request with new token');
          return api(originalRequest);
        } else {
          console.error('Token refresh response did not contain access token:', response.data);
          throw new Error('Invalid token refresh response');
        }
      } catch (refreshError: any) {
        console.error('Token refresh error:', refreshError);
        console.error('Error details:', refreshError.response?.data);
        
        // If refresh fails, clear tokens and reject
        localStorage.removeItem('tokens');
        localStorage.removeItem('expert');
        localStorage.removeItem('user');
        localStorage.removeItem('auth_role');
        
        // Pass through the refresh error for the caller to handle
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const expertService = {
  submitKnowledge: async (knowledge: string) => {
    const response = await api.post('train/', { knowledge });
    return response.data;
  },

  getKnowledge: async () => {
    try {
      const response = await api.get('knowledge/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateKnowledge: async (id: string, knowledge: string) => {
    try {
      const response = await api.put(`knowledge/${id}/`, { knowledge });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteKnowledge: async (id: string) => {
    try {
      const response = await api.delete(`knowledge/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const chatService = {
  sendMessage: async (message: string, expertId: string) => {
    try {
      const response = await api.post('chat/', { message, expert_id: expertId });
      if (!response.data || !response.data.answer) {
        throw new Error('Invalid response format from server');
      }
      return response.data;
    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }
};

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      console.log('Login request payload:', { email, password: '***' });
      // Try the login endpoint first, fall back to login/ if it fails
      let response;
      try {
        response = await api.post('login/', {
          email,
          password,
        });
      } catch (error) {
        console.log('Falling back to login/ endpoint');
        response = await api.post('login/', {
          email,
          password,
        });
      }
      console.log('Login response:', response.data);
      
      // Response structure should be:
      // { tokens: { access, refresh }, user: {...}, message: "..." }
      if (!response.data.tokens) {
        console.error('Invalid login response format, missing tokens object:', response.data);
        throw new Error('Invalid response format from server');
      }
      
      const { access, refresh } = response.data.tokens;
      
      // Store tokens in localStorage
      const tokens = { access, refresh };
      localStorage.setItem('tokens', JSON.stringify(tokens));
      
      // Add token to headers for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      if (response.data.user) {
        // Store user data directly from the response
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Return the complete response
        return response.data;
      }
      
      try {
        // If user data is not in the response, try to get user profile
        const userResponse = await api.get<any>('user/profile/');
        console.log('User profile response:', userResponse.data);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(userResponse.data));
        
        return {
          tokens: tokens,
          user: userResponse.data,
          message: 'Login successful',
        };
      } catch (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Return a partial success
        return {
          tokens: tokens,
          message: 'Login successful but profile fetch failed',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.response?.data?.detail || error.response?.data?.error || 'Login failed');
    }
  },

  register: async (name: string, email: string, password: string, isExpertRegistration: boolean = false, userRole: 'user' | 'expert' = 'user'): Promise<AuthResponse> => {
    try {
      // Use the appropriate registration endpoint based on user type
      const endpoint = isExpertRegistration ? 'register/' : 'user/register/';
      
      // Prepare the request data
      const requestData: any = {
        name,
        email,
        password,
      };
      
      // For the unified user registration endpoint, include the role
      if (!isExpertRegistration) {
        requestData.role = userRole;
      }
      
      const response = await api.post<any>(endpoint, requestData);

      // Email verification flow - response will just have user data and message
      if (response.data.message && response.data.message.includes('verify')) {
        return {
          tokens: { access: '', refresh: '' }, // Empty tokens for verification flow
          user: response.data.user || response.data.expert || { id: '', email, name },
          message: response.data.message
        };
      }

      // Only set tokens if they are returned (when verification is not required)
      if (response.data.tokens) {
        const { access, refresh } = response.data.tokens;
        const tokens = { access, refresh };
        localStorage.setItem('tokens', JSON.stringify(tokens));
        
        // Add token to headers for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        // Store user data
        const userData = response.data.user || response.data.expert;
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Registration failed');
      }
      throw new Error('Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expert');
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    delete api.defaults.headers.common['Authorization'];
  },

  refreshToken: async (): Promise<string> => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token available');

    try {
      const response = await axios.post<{ access: string }>(`${API_URL}token/refresh/`, {
        refresh,
      });

      const newAccessToken = response.data.access;
      localStorage.setItem('access_token', newAccessToken);
      
      // Update the default headers with the new token
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      return newAccessToken;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expert');
      delete api.defaults.headers.common['Authorization'];
      throw new Error('Failed to refresh token');
    }
  },

  getExpertProfile: async (): Promise<ExpertData> => {
    const response = await api.get<ExpertData>('profile/');
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('password-reset/', { email });
    return response.data;
  },

  confirmPasswordReset: async (uidb64: string, token: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> => {
    const response = await api.post(`password-reset-confirm/${uidb64}/${token}/`, {
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  },

  changeEmail: async (newEmail: string, currentPassword: string): Promise<{ message: string }> => {
    const response = await api.post('profile/change-email/', {
      new_email: newEmail,
      current_password: currentPassword
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('profile/change-password/', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  },
};

export const expertApi = {
  updateProfile: async (profileData: {
    name?: string;
    bio?: string;
    specialties?: string;
    title?: string;
    profile?: {
      industry?: string;
      years_of_experience?: number;
      key_skills?: string;
      typical_problems?: string;
      background?: string;
      certifications?: string;
      methodologies?: string;
      tools_technologies?: string;
    };
  }) => {
    try {
      const response = await api.put('profile/update/', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getProfile: async () => {
    try {
      console.log('ExpertApi.getProfile - Starting request...');
      console.log('ExpertApi.getProfile - API URL:', API_URL);
      console.log('ExpertApi.getProfile - Full URL:', `${API_URL}profile/`);
      
      // Check if we have auth headers
      const tokens = localStorage.getItem('tokens');
      console.log('ExpertApi.getProfile - Tokens in localStorage:', tokens ? 'Present' : 'Not found');
      
      if (tokens) {
        try {
          const parsedTokens = JSON.parse(tokens);
          console.log('ExpertApi.getProfile - Access token present:', parsedTokens.access ? 'Yes' : 'No');
        } catch (e) {
          console.log('ExpertApi.getProfile - Error parsing tokens:', e);
        }
      }
      
      const response = await api.get('profile/');
      console.log('ExpertApi.getProfile - Success response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('ExpertApi.getProfile - Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      throw error;
    }
  },

  uploadProfileImage: async (imageFile: File) => {
    try {
      const formData = new FormData();
      formData.append('profile_image', imageFile);
      
      // Don't set Content-Type header - let the browser set it automatically with boundary
      const response = await api.post('profile/upload-image/', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteProfile: async (): Promise<{ message: string }> => {
    const response = await api.delete('profile/delete/');
    return response.data;
  },

  completeOnboarding: async (profileData: ExpertProfileData) => {
    try {
      // Create the expert profile directly via a new endpoint
      const response = await api.post('profile/complete-onboarding/', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const trainingService = {
  getOnboardingStatus: async () => {
    try {
      const response = await api.get('onboarding/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitOnboardingAnswer: async (data: { question_id: number; answer: string }) => {
    try {
      const response = await api.post('onboarding/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  updateOnboardingAnswer: async (data: { question_id: number; answer: string }) => {
    try {
      const response = await api.put('onboarding/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getOnboardingAnswers: async () => {
    try {
      const response = await api.get('onboarding/answers/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  processKnowledge: async () => {
    try {
      const response = await api.post('knowledge/process/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDocuments: async () => {
    try {
      const response = await api.get('documents/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  uploadDocuments: async (formData: FormData) => {
    try {
      // Don't set Content-Type header - let the browser set it automatically with boundary
      const response = await api.post('documents/upload/', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  deleteDocument: async (documentId: number) => {
    try {
      const response = await api.delete(`documents/${documentId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getChatHistory: async () => {
    try {
      const response = await api.get('training/chat/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendMessage: async (message: string) => {
    try {
      console.log('Sending message:', message);
      const response = await api.post('training/chat/', { message });
      console.log('Received response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  },

  getTrainingStats: async () => {
    try {
      const response = await api.get('training/stats/');
      return response.data;
    } catch (error) {
      console.error('Error getting training stats:', error);
      throw error;
    }
  }
};

export const userApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    // Use the unified authApi login method - no separate endpoints
    return authApi.login(email, password);
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    // Use the unified registration endpoint with user role (false = user registration)
    return authApi.register(name, email, password, false);
  },

  getProfile: async (): Promise<UserData> => {
    const response = await api.get<UserData>('user/profile/');
    return response.data;
  },

  updateProfile: async (profileData: any): Promise<UserData> => {
    const response = await api.put('user/profile/update/', profileData);
    return response.data;
  },

  uploadProfileImage: async (imageFile: File): Promise<UserData> => {
    try {
      const formData = new FormData();
      formData.append('profile_image', imageFile);
      
      // Try the user profile update endpoint with the image
      const response = await api.put('user/profile/update/', formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteProfile: async (): Promise<{ message: string }> => {
    const response = await api.delete('user/profile/delete/');
    return response.data;
  }
};

// Add a special debug login method that uses fetch directly
export const debugLogin = async (email: string, password: string) => {
  console.log('Debug login with:', { email, password: '****' });
  
  try {
    // Try multiple endpoints with fetch API
    const endpoints = [
      `${baseUrl}/api/login/`,
      '/api/login/',
      `${baseUrl}/login/`,
      '/login/'
    ];
    
    let lastError = null;
    let lastErrorMessage = null;
    let successResponse = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
          console.log(`Endpoint ${endpoint} failed with status: ${response.status}`);
          
          // Try to extract error message from response
          try {
            const errorData = await response.json();
            console.log('Error response data:', errorData);
            
            // Extract the specific error message from backend
            if (errorData.error) {
              lastErrorMessage = errorData.error;
            } else if (errorData.detail) {
              lastErrorMessage = errorData.detail;
            } else if (errorData.message) {
              lastErrorMessage = errorData.message;
            }
          } catch (jsonError) {
            console.log('Could not parse error response as JSON');
            const text = await response.text();
            console.log('Response text:', text);
          }
          continue;
        }
        
        const data = await response.json();
        console.log(`Endpoint ${endpoint} succeeded:`, data);
        successResponse = data;
        break;
      } catch (err) {
        console.log(`Error with endpoint ${endpoint}:`, err);
        lastError = err;
      }
    }
    
    if (successResponse) {
      return successResponse;
    }
    
    // Throw the actual backend error message if we have it
    if (lastErrorMessage) {
      throw new Error(lastErrorMessage);
    }
    
    throw lastError || new Error('All login endpoints failed');
  } catch (error) {
    console.error('Debug login error:', error);
    throw error;
  }
};

// Add a direct test function to validate the API connection
export const testBackendConnection = async () => {
  try {
    // Log all the steps for debugging
    console.log('Testing backend connection...');
    console.log('API URL:', API_URL);
    
    // First try with fetch for a more direct test
    console.log('Testing with fetch API...');
    const fetchResponse = await fetch(`${API_URL.replace(/\/api\/?$/, '')}/health/`);
    console.log('Fetch response status:', fetchResponse.status);
    const fetchText = await fetchResponse.text();
    console.log('Fetch response text:', fetchText);
    
    // Then try with axios for comparison
    console.log('Testing with axios...');
    const axiosResponse = await axios.get(`${API_URL.replace(/\/api\/?$/, '')}/health/`);
    console.log('Axios response status:', axiosResponse.status);
    console.log('Axios response data:', axiosResponse.data);
    
    return {
      success: true,
      fetchResponse: fetchText,
      axiosResponse: axiosResponse.data
    };
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return {
      success: false,
      error
    };
  }
};

// Backend connection test available but not run automatically to avoid CORS issues

export default api; 