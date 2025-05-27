import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { chatService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  expertId: string;
  expertName?: string;
}

export const Chat: React.FC<ChatProps> = ({ expertId, expertName = 'Expert' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { isUser, isExpert, isAuthenticated, user, expert, signIn, register } = useAuth();
  
  // Extract first name
  const firstName = expertName.split(' ')[0];
  
  // Debug info
  useEffect(() => {
    console.log('Chat component auth state:', { 
      isAuthenticated, 
      isUser, 
      isExpert, 
      user: user ? `${user.email} (${user.role})` : 'none',
      expert: expert ? `${expert.email} (${expert.id})` : 'none',
      expertId,
      currentPath: window.location.pathname
    });
  }, [isAuthenticated, isUser, isExpert, user, expert, expertId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    console.log('Submit pressed - auth state:', { isAuthenticated, isExpert, isUser });

    // If user is not authenticated, show login dialog
    if (!isAuthenticated) {
      console.log('Not authenticated, showing login dialog');
      setIsAuthDialogOpen(true);
      return;
    }

    // Remove the check for own AI - allow chatting with any AI
    
    const userMessage = input.trim();
    setInput('');
    setError('');
    setLoading(true);

    console.log('Sending message to AI:', { userMessage, expertId });
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await chatService.sendMessage(userMessage, expertId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer },
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Show the specific error message from the backend if available
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'I\'m having trouble formulating a response right now. Please try again later.';
      setError(errorMessage);
      
      
      // Add the error message as a system message in the chat
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle user sign in
  const handleUserSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password, false); // false indicates user login, not expert
      setIsAuthDialogOpen(false);
      // No need to set input again, it's still there
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  // Handle user registration
  const handleUserRegister = async (name: string, email: string, password: string) => {
    try {
      const result = await register(name, email, password, false); // false indicates user registration, not expert
      setIsAuthDialogOpen(false);
      // No need to set input again, it's still there
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  // Create login prompt or chat based on authentication status
  const renderChatOrPrompt = () => {
    // Log authentication state for debugging - include more information
    console.log('Chat component auth debug - DETAILED:', { 
      isAuthenticated, 
      isUser, 
      isExpert, 
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        is_expert: user.is_expert,
        is_user: user.is_user
      } : 'none',
      expert: expert ? {
        id: expert.id,
        email: expert.email
      } : 'none',
      expertId,
      tokens: localStorage.getItem('tokens') ? 'present' : 'none',
      localStorageUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : 'none'
    });

    // MAIN CHECK: if user is not authenticated, show login prompt
    if (!isAuthenticated) {
      console.log('Authentication check failed - showing login prompt');
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '300px' 
          }}
        >
          <Typography variant="h6" align="center" gutterBottom>
            Sign in to chat with {firstName}'s AI
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setIsAuthDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Sign In / Register
          </Button>
          
          {/* Debug button for direct login */}
          <Button
            variant="outlined"
            color="secondary"
            onClick={async () => {
              try {
                console.log('Attempting direct login with test account');
                const result = await signIn('f@lu1.com', 'password', true);
                console.log('Direct login result:', result);
              } catch (error) {
                console.error('Direct login error:', error);
              }
            }}
            sx={{ mt: 2 }}
          >
            Debug: Login as Expert
          </Button>
        </Box>
      );
    }

    console.log('Authentication check passed - user is authenticated');

    // Remove the check for own AI - allow chatting with any AI interface

    console.log('Showing chat interface - all checks passed');

    // Otherwise, show the chat interface
    return (
      <>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: '#fafafa',
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  backgroundColor: message.role === 'user' ? '#1976d2' : 'white',
                  color: message.role === 'user' ? 'white' : 'text.primary',
                  borderRadius: 2,
                  boxShadow: message.role === 'user' ? 1 : 2,
                }}
              >
                <Typography variant="body1">
                  {message.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {error && (
            <Typography color="error" sx={{ textAlign: 'center', p: 2 }}>
              {error}
            </Typography>
          )}
        </Box>

        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            p: 2, 
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            bgcolor: 'white',
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#f8f9fa',
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !input.trim()}
            sx={{
              px: 4,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#1976d2',
              '&:hover': {
                bgcolor: '#1565c0',
              }
            }}
          >
            Send
          </Button>
        </Box>
      </>
    );
  };

  return (
    <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={2} 
        sx={{ 
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'white',
        }}
      >
        {renderChatOrPrompt()}
      </Paper>

      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
      />
    </Box>
  );
}; 