import axios from 'axios';

const API_URL = 'http://localhost:8000';

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

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Request headers:', config.headers);
  } else {
    console.log('No access token found in localStorage');
  }
  return config;
});

// Add request interceptor to include CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
});

export const expertService = {
  submitKnowledge: async (knowledge: string) => {
    const response = await api.post('/api/train/', { knowledge });
    return response.data;
  },

  getKnowledge: async () => {
    try {
      const response = await api.get('/api/knowledge/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateKnowledge: async (id: string, knowledge: string) => {
    try {
      const response = await api.put(`/api/knowledge/${id}/`, { knowledge });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteKnowledge: async (id: string) => {
    try {
      const response = await api.delete(`/api/knowledge/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export const chatService = {
  sendMessage: async (question: string) => {
    try {
      const response = await api.post('/api/chat/', { question });
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

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface ExpertData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  specialties: string;
}

export interface AuthResponse {
  tokens: LoginResponse;
  expert: ExpertData;
  message: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<LoginResponse>('/api/token/', {
      username: email,
      password,
    });
    
    // Store tokens
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    
    // Get expert data
    const expertResponse = await api.get<ExpertData>('/api/expert/profile/');
    
    return {
      tokens: response.data,
      expert: expertResponse.data,
      message: 'Login successful',
    };
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/register/', {
      name,
      email,
      password,
    });

    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);

    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  refreshToken: async (): Promise<string> => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token available');

    const response = await api.post<{ access: string }>('/api/token/refresh/', {
      refresh,
    });

    localStorage.setItem('access_token', response.data.access);
    return response.data.access;
  },
};

export const expertApi = {
  updateProfile: async (profileData: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    specialties?: string;
  }) => {
    try {
      const response = await api.put('/api/expert/profile/update/', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/api/expert/profile/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default api; 