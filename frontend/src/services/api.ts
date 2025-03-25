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

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (err) {
        // If refresh fails, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// Add request interceptor to include CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
});

export const expertService = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post('/api/register/', data);
    return response.data;
  },

  signIn: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/token/', {
      username: data.email,
      password: data.password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/expert/profile/');
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await api.put('/api/expert/profile/update/', profileData);
    return response.data;
  },

  submitKnowledge: async (knowledge: string) => {
    const response = await api.post('/api/train/', { knowledge });
    return response.data;
  },

  getKnowledge: async () => {
    const response = await api.get('/api/knowledge/');
    return response.data;
  },

  updateKnowledge: async (id: string, knowledge: string) => {
    const response = await api.put(`/api/knowledge/${id}/`, { knowledge });
    return response.data;
  },

  deleteKnowledge: async (id: string) => {
    const response = await api.delete(`/api/knowledge/${id}/`);
    return response.data;
  },
};

export const chatService = {
  sendMessage: async (message: string) => {
    const response = await api.post('/api/chat/', { question: message });
    return response.data;
  },
};

export const trainingService = {
  // Get all training sessions for the current expert
  getSessions: async () => {
    const response = await api.get('/api/training/sessions/');
    return response.data;
  },

  // Start a new training session
  startSession: async (fieldOfKnowledge: string) => {
    const response = await api.post('/api/training/sessions/', {
      field_of_knowledge: fieldOfKnowledge,
    });
    return response.data;
  },

  // Get the next question in a session
  getNextQuestion: async (sessionId: string) => {
    const response = await api.get(`/api/training/sessions/${sessionId}/questions/`);
    return response.data;
  },

  // Submit an answer for a question
  submitAnswer: async (sessionId: string, questionId: string, answer: string) => {
    const response = await api.post(`/api/training/sessions/${sessionId}/questions/`, {
      question_id: questionId,
      answer: answer,
    });
    return response.data;
  },
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