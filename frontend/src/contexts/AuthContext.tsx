import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi, ExpertData } from '../services/api';
import { userApi } from '../services/api';
import { API_URL } from '../services/api';
import api from '../services/api';
import axios from 'axios';
import { debugLogin } from '../services/api';

// Add User interface
interface UserData {
  id: string;
  email: string;
  name: string;
  role: string; // 'user', 'expert', or 'admin'
  is_expert?: boolean; // Whether user is an expert - for backward compatibility
  is_user?: boolean;   // Whether user is a regular user - for backward compatibility
  // Expert-related fields
  bio?: string;
  specialties?: string;
  title?: string;
  onboarding_completed?: boolean;
  profile_image?: string;
  total_training_messages?: number;
  last_training_at?: string;
}

interface AuthResponse {
  expert?: ExpertData;
  user?: UserData;
  tokens: {
    access: string;
    refresh: string;
  };
  message: string;
}

interface AuthContextType {
  expert: ExpertData | null;
  user: UserData | null;
  isAuthenticated: boolean;
  isExpert: boolean;
  isUser: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string, isExpertLogin?: boolean) => Promise<{ success: boolean; message?: string }>;
  signOut: () => void;
  register: (name: string, email: string, password: string, isExpertRegistration?: boolean, userRole?: 'user' | 'expert') => Promise<{ success: boolean; message?: string }>;
  error: string | null;
  clearError: () => void;
  refreshExpert: () => Promise<ExpertData>;
  refreshUser: () => Promise<UserData>;
  setUser: (user: UserData | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsExpert: (value: boolean) => void;
  setIsUser: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook for using the auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Load expert data from localStorage
const loadExpert = (): ExpertData | null => {
  try {
    const expertString = localStorage.getItem('expert');
    if (expertString) {
      return JSON.parse(expertString);
    }
  } catch (error) {
    console.error('Error loading expert data from localStorage:', error);
  }
  return null;
};

// Load user data from localStorage
const loadUser = (): UserData | null => {
  try {
    const userString = localStorage.getItem('user');
    if (userString) {
      return JSON.parse(userString);
    }
  } catch (error) {
    console.error('Error loading user data from localStorage:', error);
  }
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expert, setExpert] = useState<ExpertData | null>(loadExpert);
  const [user, setUser] = useState<UserData | null>(loadUser);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExpert, setIsExpert] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tokens = localStorage.getItem('tokens');
        const savedUser = localStorage.getItem('user');
        
        console.log('Auth check - tokens:', tokens ? 'Present' : 'None');
        console.log('Auth check - user data:', savedUser ? 'Present' : 'None');
        
        if (!tokens) {
          console.log('No tokens found, clearing auth state');
          signOut();
          return;
        }
        
        // Parse tokens to check validity
        let parsedTokens;
        try {
          parsedTokens = JSON.parse(tokens);
          if (!parsedTokens.access || !parsedTokens.refresh) {
            console.error('Invalid token format in localStorage');
            signOut();
            return;
          }
        } catch (error) {
          console.error('Error parsing tokens:', error);
          signOut();
          return;
        }
        
        // Set API authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${parsedTokens.access}`;
        
        if (savedUser) {
          // User auth flow with role check
          try {
            const userData = JSON.parse(savedUser);
            console.log('Auth flow - role:', userData.role);
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Set expert/user flags based on role
            if (userData.role === 'expert') {
              setIsExpert(true);
              setIsUser(false);
              // For backward compatibility
              setExpert(userData);
            } else {
              setIsExpert(false);
              setIsUser(true);
            }
            
            // Refresh user data in the background
            refreshUser().catch(err => {
              console.log('Background user refresh error:', err);
              // Don't log out on background refresh error
            });
          } catch (error) {
            console.error('Error parsing user data:', error);
            signOut();
          }
        } else {
          // If token exists but no user data, something's wrong
          console.error('Tokens exist but no valid user data found');
          signOut();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If profile fetch fails, clear authentication state
        signOut();
      }
    };
    
    checkAuth();
  }, []);

  const refreshExpert = async () => {
    try {
      const expertData = await authApi.getExpertProfile();
      setExpert(expertData);
      localStorage.setItem('expert', JSON.stringify(expertData));
      return expertData;
    } catch (error) {
      console.error('Error refreshing expert data:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      // Make a call to get the latest user data
      const tokensStr = localStorage.getItem('tokens');
      if (!tokensStr) {
        console.log("No tokens found in localStorage during refreshUser");
        throw new Error('No authentication token available');
      }
      
      const tokens = JSON.parse(tokensStr);
      console.log("Parsed tokens during refreshUser:", tokens);
      
      if (!tokens.access) {
        console.log("No access token in tokens object:", tokens);
        throw new Error('Access token missing');
      }
      
      console.log('Refreshing user data using token');
      
      // Set the Authorization header for this specific request
      const config = {
        headers: {
          'Authorization': `Bearer ${tokens.access}`
        }
      };
      
      console.log("Authorization header for refresh:", config.headers.Authorization);
      
      // Use api instance which has interceptors for token refresh
      try {
        console.log("Fetching profile from user/profile/");
        const response = await api.get('user/profile/', config);
        console.log("Profile response:", response.data);
        
        if (response.data) {
          // Add role if not present
          if (!response.data.role) {
            // Check if the user data has an explicit is_expert flag
            if (typeof response.data.is_expert === 'boolean') {
              response.data.role = response.data.is_expert ? 'expert' : 'user';
            } else {
              // Default to 'user' if no role information is available
              response.data.role = 'user';
            }
          }
          
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
          return response.data;
        } else {
          throw new Error('Empty response from user profile API');
        }
      } catch (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        
        // Try to get the user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          
          // If we have a user ID, try the direct endpoint
          if (parsedUser && parsedUser.id) {
            console.log('Attempting to fetch user profile directly using ID:', parsedUser.id);
            try {
              // Use a direct URL without tokens - this should match the backend URL pattern
              const directResponse = await api.get(`user/profile/direct/${parsedUser.id}/`, {
                headers: {
                  'Cache-Control': 'no-cache',
                }
              });
              
              if (directResponse.data) {
                // Ensure we have a role property
                const userData = directResponse.data as UserData;
                if (!userData.role) {
                  // Check if the user data has an explicit is_expert flag
                  if (typeof userData.is_expert === 'boolean') {
                    userData.role = userData.is_expert ? 'expert' : 'user';
                  } else {
                    // Default to 'user' if no role information is available
                    userData.role = 'user';
                  }
                }
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                return userData;
              }
            } catch (directError) {
              console.error('Error fetching user profile directly:', directError);
              // Just continue with the error handling below
            }
          }
        }
        
        // Re-throw the error for the caller to handle
        throw fetchError;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, isExpertRegistration = false, userRole?: 'user' | 'expert') => {
    setIsLoading(true);
    try {
      // Pass the isExpertRegistration parameter to determine the correct endpoint
      const response = await authApi.register(name, email, password, isExpertRegistration, userRole);
      
      // For registration with email verification, we don't log in automatically
      // Check message for verification notification
      if (response.message && response.message.includes("verify")) {
        // Email verification flow - don't set user as authenticated
        return { 
          success: true, 
          message: response.message 
        };
      }
      
      // Only continue with authentication if tokens were returned
      if (response.tokens && response.tokens.access) {
        // Get user data from response (works with unified model)
        const userData = response.user || response.expert;
        
        if (!userData) {
          throw new Error('No user data in response');
        }
        
        // Create a proper UserData object with required fields
        const userWithRole: UserData = {
          id: userData.id,
          email: userData.email,
          name: userData.name || (userData as any).first_name || "User",
          role: response.user ? 'user' : 'expert',
          // Copy over any additional fields
          ...(userData as any)
        };
        
        // Store user data in localStorage
        localStorage.setItem('tokens', JSON.stringify(response.tokens));
        localStorage.setItem('user', JSON.stringify(userWithRole));
        
        // Set user state
        setUser(userWithRole);
        setIsAuthenticated(true);
        
        // Set expert/user flags based on role
        if (userWithRole.role === 'expert') {
          setIsExpert(true);
          setIsUser(false);
          // For backward compatibility
          setExpert(userData as ExpertData);
        } else {
          setIsExpert(false);
          setIsUser(true);
        }
        
        // Set API authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${response.tokens.access}`;
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
      return { success: false, message: error.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, isExpertLogin = true): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      console.log('signIn method called with:', { email, isExpertLogin });
      
      // Try the debug login method first
      console.log('Attempting login with debug method');
      const debugResponse = await debugLogin(email, password);
      console.log('Debug login response:', debugResponse);
      
      if (!debugResponse.tokens) {
        console.error('Invalid login response format, missing tokens object:', debugResponse);
        throw new Error('Invalid response format from server');
      }
      
      // Store tokens in localStorage
      localStorage.setItem('tokens', JSON.stringify(debugResponse.tokens));
      
      // Get user data from response
      const userData = debugResponse.user;
      
      if (!userData) {
        throw new Error('No user data in response');
      }
      
      console.log('User data from login response:', userData);
      
      // Make sure the userData object has all required fields
      if (!userData.id || !userData.email || !userData.name) {
        console.error('User data missing required fields:', userData);
        throw new Error('Incomplete user data in response');
      }
      
      // Make sure role is present
      if (!userData.role) {
        console.warn('Role not specified in user data, determining from is_expert flag');
        userData.role = userData.is_expert ? 'expert' : 'user';
      }
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // IMPORTANT: First set authentication state, then user state
      setIsAuthenticated(true);
      console.log('isAuthenticated set to true');
      
      // Set user state
      setUser(userData);
      
      // Set expert/user flags based on role
      if (userData.role === 'expert') {
        setIsExpert(true);
        setIsUser(false);
        // For backward compatibility, also set expert data
        setExpert(userData as ExpertData);
        console.log('Expert login successful, isExpert=true, isUser=false');
      } else {
        setIsExpert(false);
        setIsUser(true);
        console.log('User login successful, isExpert=false, isUser=true');
      }
      
      // Set API authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${debugResponse.tokens.access}`;
      console.log('Authorization header set with token');
      
      // Double-check the state has been updated
      setTimeout(() => {
        console.log('Auth state after login:', {
          isAuthenticated: true, 
          isExpert: userData.role === 'expert',
          isUser: userData.role !== 'expert',
          userRole: userData.role
        });
      }, 0);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      const message = error.message || 'Failed to sign in';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expert');
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    localStorage.removeItem('auth_role');
    
    // Clear any other localStorage items that might be causing issues
    localStorage.removeItem('expertAuthInitialTab');
    localStorage.removeItem('userAuthInitialTab');
    localStorage.removeItem('openProfileSetup');
    
    setExpert(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsExpert(false);
    setIsUser(false);
    
    // Clear authorization header
    delete api.defaults.headers.common['Authorization'];
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    expert,
    user,
    isAuthenticated,
    isExpert,
    isUser,
    isLoading,
    signIn,
    signOut,
    register,
    error,
    clearError,
    refreshExpert,
    refreshUser,
    setUser,
    setIsAuthenticated,
    setIsExpert,
    setIsUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { useAuth }; 