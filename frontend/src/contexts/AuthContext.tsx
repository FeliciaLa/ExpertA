import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authApi, ExpertData } from '../services/api';

interface Expert extends ExpertData {}

interface AuthContextType {
  expert: Expert | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Load expert from localStorage
const loadExpert = (): Expert | null => {
  const expertData = localStorage.getItem('expert');
  return expertData ? JSON.parse(expertData) : null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expert, setExpert] = useState<Expert | null>(loadExpert);
  const [error, setError] = useState<string | null>(null);

  // Save expert to localStorage whenever it changes
  useEffect(() => {
    if (expert) {
      localStorage.setItem('expert', JSON.stringify(expert));
    } else {
      localStorage.removeItem('expert');
    }
  }, [expert]);

  const register = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      const response = await authApi.register(name, email, password);
      setExpert(response.expert);
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await authApi.login(email, password);
      setExpert(response.expert);
    } catch (error) {
      console.error('Sign in failed:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed');
      throw error;
    }
  };

  const signOut = () => {
    authApi.logout();
    setExpert(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        expert,
        isAuthenticated: !!expert,
        signIn,
        signOut,
        register,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth }; 