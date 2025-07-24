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
    freeMessagesRemaining: expertName === 'The Stoic Mentor' ? 25 : 3
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { isUser, isExpert, isAuthenticated, user, expert, signIn, register } = useAuth();
  
  // Use full name instead of just first name
  const firstName = expertName;
  
  // Check for existing consent on component load
  useEffect(() => {
    const checkConsent = () => {
      const storedConsent = localStorage.getItem('consent_accepted');
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
            localStorage.removeItem('consent_accepted');
            setHasUserConsent(false);
          }
        } catch (error) {
          console.error('Error parsing consent data:', error);
          localStorage.removeItem('consent_accepted');
          setHasUserConsent(false);
        }
      }
    };

    checkConsent();
  }, []);
  
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    // Only require authentication for The Stoic Mentor (monetized expert)
    if (!isAuthenticated && expertName === 'The Stoic Mentor') {
      console.log('Not authenticated, showing login dialog');
      setIsAuthDialogOpen(true);
      return;
    }

    // For non-authenticated users, require consent before allowing chat
    if (!isAuthenticated && !hasUserConsent) {
      console.log('User needs to accept consent');
      setShowConsentModal(true);
      return;
    }

    // Check if user should be blocked (only for The Stoic Mentor)
    if (shouldBlockMessage() && expertName === 'The Stoic Mentor') {
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
            hasActivePaidSession: prev.hasActivePaidSession,
            responseMessages: response.total_messages,
            currentFreeRemaining: prev.freeMessagesRemaining
          });
          
          if (prev.hasActivePaidSession) {
            // User has paid - count down from 2 messages for this session
            const newRemaining = Math.max(0, 20 - Math.floor(response.total_messages / 2));
            console.log('💳 PAID SESSION UPDATE:', {
              sessionMessages: response.total_messages,
              newRemaining: newRemaining
            });
            return {
              ...prev,
              messageCount: response.total_messages,
              freeMessagesRemaining: newRemaining
            };
          } else {
            // User is on free messages
            const newRemaining = monetizationEnabled ? Math.max(0, (expertName === 'The Stoic Mentor' ? 25 : 3) - Math.floor(response.total_messages / 2)) : prev.freeMessagesRemaining;
            console.log('🆓 FREE SESSION UPDATE:', {
              sessionMessages: response.total_messages,
              newRemaining: newRemaining
            });
            return {
        ...prev,
              messageCount: response.total_messages,
              freeMessagesRemaining: newRemaining
            };
          }
        });
        
        console.log('Updated session stats:', {
          totalMessages: response.total_messages,
          sessionId: response.session_id
        });
      } else {
        console.log('❌ NO total_messages in response - session stats NOT updated');
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
      freeMessagesRemaining: expertName === 'The Stoic Mentor' ? 20 : 0 // 20 messages for paid session
    }));
    
    setShowPaymentDialog(false);
    setShowPaymentSuccess(true);
    
    // Add a system message about the paid session
    const systemMessage = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      content: expertName === 'The Stoic Mentor' 
        ? `🎉 Thank you for your payment! You now have 20 additional messages with ${firstName}. Feel free to ask detailed questions and get in-depth philosophical guidance. Your extended session is active now.`
        : `🎉 Thank you for your payment! Your consultation session with ${firstName} is now active. Feel free to ask detailed questions and get expert advice.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, systemMessage]);
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

  // Handle consent submission
  const handleConsentSubmission = async (consentData: ConsentData) => {
    try {
      console.log('Submitting consent to server:', consentData);
      
      // Submit consent to server for legal record
      await consentService.submitConsent(consentData);
      
      // Update local state
      setHasUserConsent(true);
      setShowConsentModal(false);
      
      console.log('Consent successfully submitted and stored');
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
    // Only require authentication for The Stoic Mentor (monetized expert)
    if (!isAuthenticated && expertName === 'The Stoic Mentor') {
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
        {/* Session status banner - HIDDEN FOR NOW DUE TO CONFUSING MESSAGING */}
        {/* {features.payments && monetizationEnabled && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            {sessionStats.hasActivePaidSession ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={expertName === 'The Stoic Mentor' ? "20 Messages Active" : "15-Min Session Active"}
                  color="success" 
                  size="small" 
                />
                <Typography variant="body2" color="text.secondary">
                  {expertName === 'The Stoic Mentor' 
                    ? `${sessionStats.freeMessagesRemaining} additional messages available`
                    : "Unlimited questions until session expires"
                  }
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`${sessionStats.freeMessagesRemaining} free messages left`} 
                    color={sessionStats.freeMessagesRemaining > 0 ? "primary" : "warning"}
                    size="small" 
                  />
                  <Typography variant="body2" color="text.secondary">
              {expertName === 'The Stoic Mentor'
                ? 'Then £1.99 for 20 messages'
                : `Then £${(validExpertPrice * 1.2).toFixed(2)} for 15-min session`
              }
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )} */}

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
                    bgcolor: expertName === 'The Stoic Mentor' ? '#d4af37' : 'primary.main',
                    color: expertName === 'The Stoic Mentor' ? '#2c3e50' : 'white',
                    mt: 0.5,
                    flexShrink: 0
                  }}
                >
                  {expertName === 'The Stoic Mentor' ? '🏛️' : expertName[0]}
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
            placeholder={
              (shouldBlockMessage() && expertName === 'The Stoic Mentor') 
                ? "Click Upgrade to continue chatting..."
                : "Type your message..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onClick={() => {
              if (shouldBlockMessage() && expertName === 'The Stoic Mentor') {
                setShowPaymentDialog(true);
              }
            }}
            disabled={loading}
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: (shouldBlockMessage() && expertName === 'The Stoic Mentor') ? '#f5f5f5' : '#f8f9fa',
                cursor: (shouldBlockMessage() && expertName === 'The Stoic Mentor') ? 'pointer' : 'text',
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!(shouldBlockMessage() && expertName === 'The Stoic Mentor') && !input.trim())}
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
            {(shouldBlockMessage() && expertName === 'The Stoic Mentor') ? 'Upgrade' : 'Send'}
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

      {expertName === 'The Stoic Mentor' && (
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
                      price={expertName === 'The Stoic Mentor' ? 1.99 : validExpertPrice * 1.2}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {features.payments && (
        <PaymentSuccessDialog
          isOpen={showPaymentSuccess}
          onClose={() => setShowPaymentSuccess(false)}
          expertName={firstName}
          sessionDuration={expertName === 'The Stoic Mentor' ? 30 : 15}
                      amountPaid={expertName === 'The Stoic Mentor' ? 1.99 : validExpertPrice * 1.2}
        />
      )}
    </Box>
  );
}; 