import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  Avatar
} from '@mui/material';
import { Payment } from '@mui/icons-material';
import { chatService, consentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';
import PaymentSection from './PaymentSection';
import PaymentSuccessDialog from './PaymentSuccessDialog';
import ConsentModal, { ConsentData } from './ConsentModal';
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
  expertProfileImage?: string;
}

export const Chat: React.FC<ChatProps> = ({ 
  expertId, 
  expertName = 'Expert', 
  expertPrice = 5,
  monetizationEnabled = false,
  expertProfileImage 
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
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasUserConsent, setHasUserConsent] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    messageCount: 0,
    hasActivePaidSession: false,
    freeMessagesRemaining: 3
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isUser, isExpert, isAuthenticated, user, expert, signIn, register } = useAuth();
  
  // Use full name instead of just first name
  const firstName = expertName;
  
  // Check for existing consent on component load
  useEffect(() => {
    const checkConsent = () => {
      // Make consent expert-specific by including expertId in the key
      const consentKey = `consent_accepted_${expertId}`;
      const storedConsent = localStorage.getItem(consentKey);
      if (storedConsent) {
        try {
          const consentData = JSON.parse(storedConsent);
          // Check if consent is still valid (not older than 90 days)
          const consentAge = Date.now() - consentData.timestamp;
          const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
          
          if (consentAge < maxAge) {
            setHasUserConsent(true);
          } else {
            // Consent expired, remove it
            localStorage.removeItem(consentKey);
            setHasUserConsent(false);
          }
        } catch (error) {
          console.error('Error parsing consent data:', error);
          localStorage.removeItem(consentKey);
          setHasUserConsent(false);
        }
      } else {
        // No consent found for this expert
        setHasUserConsent(false);
      }
    };

    checkConsent();
  }, [expertId]); // Re-check when expertId changes
  
  // Load chat behavior - every session starts fresh for privacy
  useEffect(() => {
    console.log('Chat component loaded:', { 
      isAuthenticated, 
      isUser, 
      isExpert, 
      expertId,
      monetizationEnabled,
      validExpertPrice,
      hasUserConsent
    });

    // No longer load chat history - every session starts fresh
    // This ensures privacy between different users/sessions
  }, [isAuthenticated, expertId, hasUserConsent]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // Scroll within the chat container, not the entire page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };


  // Check if user should be blocked from sending more messages
  const shouldBlockMessage = () => {
    if (!features.payments) return false; // Payments disabled, unlimited chat
    if (!monetizationEnabled) return false; // Free expert, unlimited chat
    
    // For paid sessions, check if they have messages remaining
    if (sessionStats.hasActivePaidSession) {
      return sessionStats.freeMessagesRemaining <= 0; // Paid credits exhausted
    }
    
    // For free sessions, check if free messages are exhausted
    return sessionStats.freeMessagesRemaining <= 0; // Free messages exhausted
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    console.log('Submit pressed - auth state:', { isAuthenticated, isExpert, isUser, hasUserConsent });

    // ALWAYS require consent first - for ALL users (authenticated and non-authenticated)
    if (!hasUserConsent) {
      console.log('User needs to accept consent for this expert');
      setShowConsentModal(true);
      return;
    }

    // For monetized experts, require authentication after consent
    if (!isAuthenticated && monetizationEnabled) {
      console.log('Not authenticated, showing login dialog');
      setIsAuthDialogOpen(true);
      return;
    }

    // Check if user should be blocked (only for monetized experts)
    if (shouldBlockMessage() && monetizationEnabled) {
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
      console.log('🔥 CHAT RESPONSE:', response);
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer },
      ]);
      
      // Update session stats with real data from backend
      console.log('🔥 CHECKING total_messages:', response.total_messages);
      if (response.total_messages !== undefined) {
        setSessionStats(prev => {
          console.log('🔥 Updating session stats after message:', {
            oldStats: prev,
            responseStats: response,
            messageCount: response.total_messages
          });
          
          // Calculate remaining messages based on whether it's monetized
          const newRemaining = monetizationEnabled ? Math.max(0, 3 - Math.floor(response.total_messages / 2)) : prev.freeMessagesRemaining;
          
          return {
            messageCount: response.total_messages,
            hasActivePaidSession: response.has_active_paid_session || false,
            freeMessagesRemaining: response.has_active_paid_session ? 
              (response.free_messages_remaining || 0) : 
              newRemaining
          };
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.error || 'Failed to send message. Please try again.');
      
      // Check if this is a limit reached error
      if (error.response?.data?.limit_reached) {
        setSessionStats(prev => ({
          ...prev,
          freeMessagesRemaining: 0
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    console.log('Payment successful');
    setShowPaymentDialog(false);
    setShowPaymentSuccess(true);
    
    // Update session stats to reflect paid session
    setSessionStats(prev => ({
      ...prev,
      hasActivePaidSession: true,
      freeMessagesRemaining: 20 // 20 messages for paid session
    }));
  };

  const handleUserSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password);
      setIsAuthDialogOpen(false);
      setError('');
      return result;
    } catch (err: any) {
      console.error('Sign in error:', err);
      throw err; // Re-throw to show error in dialog
    }
  };

  const handleUserRegister = async (name: string, email: string, password: string) => {
    try {
      const result = await register(name, email, password, false, 'user');
      setIsAuthDialogOpen(false);
      setError('');
      return result;
    } catch (err: any) {
      console.error('Registration error:', err);
      throw err; // Re-throw to show error in dialog
    }
  };

  // Handle consent submission
  const handleConsentSubmission = async (consentData: ConsentData) => {
    try {
      console.log('Submitting consent to server:', consentData);
      
      // Submit consent to server for legal record
      await consentService.submitConsent(consentData);
      
      // Store consent locally with expert-specific key
      const consentKey = `consent_accepted_${expertId}`;
      localStorage.setItem(consentKey, JSON.stringify({
        ...consentData,
        expertName,
        expertId,
        timestamp: Date.now()
      }));
      
      // Update local state
      setHasUserConsent(true);
      setShowConsentModal(false);
      
      console.log('Consent successfully submitted and stored for expert:', expertName);
    } catch (error) {
      console.error('Failed to submit consent:', error);
      // Still allow local consent to avoid blocking user, but log the issue
      setHasUserConsent(true);
      setShowConsentModal(false);
      throw error; // Re-throw to show error in modal
    }
  };

  // Create login prompt or chat based on authentication status
  const renderChatOrPrompt = () => {
    // For monetized experts, require authentication
    if (!isAuthenticated && monetizationEnabled) {
      return (
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Welcome to {expertName}'s AI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please sign in to start chatting
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setIsAuthDialogOpen(true)}
            sx={{ px: 4 }}
          >
            Sign In / Register
          </Button>
        </Box>
      );
    }

    // Main chat interface for authenticated users or free experts
    return (
      <>
        {/* Session Status Bar */}
        {sessionStats.hasActivePaidSession && (
          <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderBottom: '1px solid #c8e6c9' }}>
            <Chip
              size="small"
              label="Paid Session Active"
              sx={{ bgcolor: '#4caf50', color: 'white', fontWeight: 'bold' }}
            />
            <Typography variant="caption" sx={{ ml: 2, color: '#2e7d32' }}>
              {sessionStats.freeMessagesRemaining > 0 
                ? `${sessionStats.freeMessagesRemaining} messages remaining`
                : 'Session expired'
              }
            </Typography>
          </Box>
        )}

        {/* Messages Container */}
        <Box 
          ref={messagesContainerRef}
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
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              {/* Show expert avatar only for assistant messages */}
              {message.role === 'assistant' && (
                <Avatar
                  src={expertProfileImage}
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '1rem',
                    bgcolor: 'primary.main',
                    color: 'white',
                    mt: 0.5,
                    flexShrink: 0
                  }}
                >
                  {expertName[0]}
                </Avatar>
              )}
              
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
          <div ref={messagesEndRef} />
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
            placeholder={shouldBlockMessage() && monetizationEnabled ? "Click Upgrade to continue chatting..." : "Type your message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onClick={() => {
              if (shouldBlockMessage() && monetizationEnabled) {
                setShowPaymentDialog(true);
              }
            }}
            disabled={loading}
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: shouldBlockMessage() && monetizationEnabled ? '#f5f5f5' : '#f8f9fa',
                cursor: shouldBlockMessage() && monetizationEnabled ? 'pointer' : 'text',
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
            {shouldBlockMessage() && monetizationEnabled ? 'Upgrade' : 'Send'}
          </Button>
        </Box>
      </>
    );
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={2} 
        sx={{ 
          width: '100%',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: 'white',
        }}
      >
        {renderChatOrPrompt()}
      </Paper>

      {monetizationEnabled && (
      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
        />
      )}

      {/* Consent Modal for non-authenticated users */}
      <ConsentModal
        open={showConsentModal}
        onConsent={handleConsentSubmission}
        expertName={expertName}
        onClose={() => setShowConsentModal(false)}
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