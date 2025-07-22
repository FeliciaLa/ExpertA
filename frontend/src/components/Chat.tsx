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
    freeMessagesRemaining: expertName === 'The Stoic Mentor' ? 25 : 3
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
      const historyData = await chatService.getChatHistory(expertId);
      console.log('Loading chat history:', historyData);
      
      if (historyData.sessions && historyData.sessions.length > 0) {
        // Collect ALL messages from ALL sessions for this expert
        const allMessages: Message[] = [];
        
        historyData.sessions.forEach((session: any) => {
          if (session.messages && Array.isArray(session.messages)) {
            session.messages.forEach((msg: any) => {
              allMessages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
              });
            });
          }
        });
        
        console.log('💬 Setting all messages:', allMessages);
        console.log('🔍 SESSION BREAKDOWN:');
        historyData.sessions.forEach((session: any, index: number) => {
          console.log(`Session ${index}: ID=${session.session_id?.substring(0,8)}, messages=${session.messages?.length || 0}, started=${session.started_at}, status=${session.status}`);
          if (session.messages) {
            session.messages.forEach((msg: any, msgIndex: number) => {
              console.log(`  Message ${msgIndex}: ${msg.role} - "${msg.content.substring(0, 50)}..."`);
            });
          }
        });
        setMessages(allMessages);
        
        // Sort sessions by creation date (most recent first)
        const sortedSessions = [...historyData.sessions].sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        
        // Calculate total messages across ALL sessions (needed for free message counting)
        const totalMessagesAcrossSessions = historyData.sessions.reduce((total: number, session: any) => {
          return total + (session.total_messages || 0);
        }, 0);
        
        // Check if there's an active PAID session
        // Logic: If there are multiple sessions, the most recent active session is likely the paid session
        console.log('🔍 PAID SESSION DETECTION:');
        console.log(`  Total sessions: ${sortedSessions.length}`);
        console.log(`  First session status: ${sortedSessions[0]?.status}`);
        console.log(`  Condition: ${sortedSessions.length > 1} && ${sortedSessions[0]?.status === 'active'}`);
        
        const activePaidSession = sortedSessions.length > 1 && sortedSessions[0].status === 'active' 
          ? sortedSessions[0] 
          : null;
          
        console.log('🔍 SELECTED PAID SESSION:', activePaidSession?.session_id || 'null');
        
        if (activePaidSession) {
          // User has paid - count messages ONLY within the paid session
          const paidSessionMessages = activePaidSession.total_messages || 0;
          setSessionStats(prev => ({
            ...prev,
            hasActivePaidSession: true,
            messageCount: paidSessionMessages,
            freeMessagesRemaining: Math.max(0, 30 - Math.floor(paidSessionMessages / 2))
          }));
          console.log('💳 Active paid session found:', {
            sessionId: activePaidSession.session_id,
            paidMessages: paidSessionMessages,
            creditsRemaining: Math.max(0, 30 - Math.floor(paidSessionMessages / 2))
          });
        } else {
          // User is still on free messages - count across ALL sessions
          setSessionStats(prev => ({
            ...prev,
            hasActivePaidSession: false,
            messageCount: totalMessagesAcrossSessions,
            freeMessagesRemaining: Math.max(0, (expertName === 'The Stoic Mentor' ? 25 : 3) - Math.floor(totalMessagesAcrossSessions / 2))
          }));
          console.log('🆓 Using free messages - total across all sessions:', totalMessagesAcrossSessions);
        }
        
        console.log('📊 Total messages across all sessions:', totalMessagesAcrossSessions);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);



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
            // User has paid - count down from 30 messages for this session
            const newRemaining = Math.max(0, 30 - Math.floor(response.total_messages / 2));
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
      freeMessagesRemaining: expertName === 'The Stoic Mentor' ? 30 : 0 // 30 messages for Stoic Mentor
    }));
    
    setShowPaymentDialog(false);
    setShowPaymentSuccess(true);
    
    // Add a system message about the paid session
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: expertName === 'The Stoic Mentor' 
        ? `🎉 Thank you for your payment! You now have 30 additional messages with ${firstName}. Feel free to ask detailed questions and get in-depth philosophical guidance. Your extended session is active now.`
        : `🎉 Thank you for your payment! You now have a 15-minute consultation session with ${firstName}. Feel free to ask detailed questions and get in-depth expert advice. Your session is active now.`
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
                <Chip 
                  label={expertName === 'The Stoic Mentor' ? "30 Messages Active" : "15-Min Session Active"}
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
                ? 'Then £2.99 for 30 messages'
                : `Then £${(validExpertPrice * 1.2).toFixed(2)} for 15-min session`
              }
            </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

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
          price={expertName === 'The Stoic Mentor' ? 2.99 : validExpertPrice * 1.2}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
      
      {features.payments && (
        <PaymentSuccessDialog
          isOpen={showPaymentSuccess}
          onClose={() => setShowPaymentSuccess(false)}
          expertName={firstName}
          sessionDuration={expertName === 'The Stoic Mentor' ? 30 : 15}
          amountPaid={expertName === 'The Stoic Mentor' ? 2.99 : validExpertPrice * 1.2}
        />
      )}
    </Box>
  );
}; 