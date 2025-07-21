import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider
} from '@mui/material';
import { Payment } from '@mui/icons-material';
import { chatService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';
import PaymentSection from './PaymentSection';
import PaymentSuccessDialog from './PaymentSuccessDialog';
import { features } from '../utils/environment';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatProps {
  expertId: string;
  expertName?: string;
  expertPrice?: number;
  monetizationEnabled?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ 
  expertId, 
  expertName = 'Expert', 
  expertPrice = 5,
  monetizationEnabled = false 
}) => {
  // Ensure expertPrice is a valid number (handle both number and string inputs)
  const validExpertPrice = (() => {
    const price = Number(expertPrice);
    return !isNaN(price) && price > 0 ? price : 5;
  })();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    messageCount: 0,
    hasActivePaidSession: false,
    freeMessagesRemaining: 3
  });
  
  const { isUser, isExpert, isAuthenticated, user, expert, signIn, register } = useAuth();
  
  // Use full name instead of just first name
  const firstName = expertName;
  
  // Load chat history when user is authenticated
  useEffect(() => {
    console.log('Chat component loaded:', { 
      isAuthenticated, 
      isUser, 
      isExpert, 
      expertId,
      monetizationEnabled,
      validExpertPrice
    });

    // Load chat history if user is authenticated
    if (isAuthenticated && expertId) {
      loadChatHistory();
    }
  }, [isAuthenticated, expertId]);

  const loadChatHistory = async () => {
    if (!isAuthenticated || !expertId) return;

    try {
      console.log('Loading chat history for expert:', expertId);
      const historyData = await chatService.getChatHistory(expertId);
      
      if (historyData.sessions && historyData.sessions.length > 0) {
        // Get the most recent active session
        const activeSession = historyData.sessions.find((session: any) => session.status === 'active') 
                           || historyData.sessions[0];
        
        if (activeSession && activeSession.messages) {
          // Convert API messages to component format
          const loadedMessages = activeSession.messages.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          setMessages(loadedMessages);
          
          // Update session stats from the loaded session
          setSessionStats(prev => ({
            ...prev,
            messageCount: activeSession.total_messages,
            freeMessagesRemaining: Math.max(0, 3 - Math.floor(activeSession.total_messages / 2))
          }));
          
          console.log('Loaded chat history:', {
            messagesCount: loadedMessages.length,
            totalMessages: activeSession.total_messages,
            sessionId: activeSession.session_id
          });
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Don't show error to user, just continue with empty chat
    }
  };

  // Check if user should be blocked from sending more messages
  const shouldBlockMessage = () => {
    if (!features.payments) return false; // Payments disabled, unlimited chat
    if (!monetizationEnabled) return false; // Free expert, unlimited chat
    if (sessionStats.hasActivePaidSession) return false; // User has paid for this session
    return sessionStats.freeMessagesRemaining <= 0; // Used up free messages
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    console.log('Submit pressed - auth state:', { isAuthenticated, isExpert, isUser });

    // If user is not authenticated, show login dialog
    if (!isAuthenticated) {
      console.log('Not authenticated, showing login dialog');
      setIsAuthDialogOpen(true);
      return;
    }

    // Check if user should be blocked (for paid experts only)
    if (shouldBlockMessage()) {
      console.log('User needs to pay for more messages');
      setShowPaymentDialog(true);
      return;
    }
    
    // Only proceed with message sending if there's actual input
    if (!input.trim()) return;
    
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
      
      // Update session stats with real data from backend
      if (response.total_messages !== undefined) {
        setSessionStats(prev => ({
          ...prev,
          messageCount: response.total_messages,
          freeMessagesRemaining: monetizationEnabled ? Math.max(0, 3 - Math.floor(response.total_messages / 2)) : prev.freeMessagesRemaining
        }));
        
        console.log('Updated session stats:', {
          totalMessages: response.total_messages,
          sessionId: response.session_id,
          freeMessagesRemaining: monetizationEnabled ? Math.max(0, 3 - Math.floor(response.total_messages / 2)) : 'unlimited'
        });
      }
      
    } catch (err: any) {
      console.error('Chat error:', err);
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

  // Handle payment success
  const handlePaymentSuccess = () => {
    // Update session to paid status
    setSessionStats(prev => ({
      ...prev,
      hasActivePaidSession: true,
      freeMessagesRemaining: 0
    }));
    
    setShowPaymentDialog(false);
    setShowPaymentSuccess(true);
    
    // Add a system message about the paid session
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `🎉 Thank you for your payment! You now have a 15-minute consultation session with ${firstName}. Feel free to ask detailed questions and get in-depth expert advice. Your session is active now.`
    }]);
  };

  // Handle user sign in
  const handleUserSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password, false);
      setIsAuthDialogOpen(false);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Handle user registration
  const handleUserRegister = async (name: string, email: string, password: string) => {
    try {
      const result = await register(name, email, password, false);
      setIsAuthDialogOpen(false);
      return result;
    } catch (error) {
      throw error;
    }
  };



  // Create login prompt or chat based on authentication status
  const renderChatOrPrompt = () => {
    // If user is not authenticated, show login prompt
    if (!isAuthenticated) {
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
        </Box>
      );
    }

    // Show the chat interface
    return (
      <>
        {/* Session status banner */}
        {features.payments && monetizationEnabled && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            {sessionStats.hasActivePaidSession ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="15-Min Session Active" color="success" size="small" />
                <Typography variant="body2" color="text.secondary">
                  Unlimited questions until session expires
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`${sessionStats.freeMessagesRemaining} free questions left`} 
                    color={sessionStats.freeMessagesRemaining > 0 ? "primary" : "warning"}
                    size="small" 
                  />
                  <Typography variant="body2" color="text.secondary">
                    Then £{(validExpertPrice * 1.2).toFixed(2)} for 15-min session
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

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
            placeholder={
              shouldBlockMessage() 
                ? "Click Upgrade to continue chatting..."
                : "Type your message..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onClick={() => {
              if (shouldBlockMessage()) {
                setShowPaymentDialog(true);
              }
            }}
            disabled={loading}
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: shouldBlockMessage() ? '#f5f5f5' : '#f8f9fa',
                cursor: shouldBlockMessage() ? 'pointer' : 'text',
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!shouldBlockMessage() && !input.trim())}
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
            {shouldBlockMessage() ? 'Upgrade' : 'Send'}
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

      {features.payments && showPaymentDialog && (
        <PaymentSection
          expertId={expertId}
          expertName={firstName}
          price={validExpertPrice * 1.2}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {features.payments && (
        <PaymentSuccessDialog
          isOpen={showPaymentSuccess}
          onClose={() => setShowPaymentSuccess(false)}
          expertName={firstName}
          sessionDuration={15}
          amountPaid={validExpertPrice * 1.2}
        />
      )}
    </Box>
  );
}; 