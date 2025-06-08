import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  Divider,
  Chip
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
// Temporarily comment out useAuth to test
// import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';
import { OnboardingInstructions } from './OnboardingInstructions';

interface Message {
  id: number;
  role: 'ai' | 'expert';
  content: string;
  created_at: string;
  context_depth: number;
  knowledge_area: string;
  conversation_state?: {
    current_topic: string;
    is_follow_up: boolean;
    expert_question: boolean;
    topic_complete: boolean;
  };
}

export const TrainingChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasStartedTraining, setHasStartedTraining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  // Temporarily comment out useAuth to test
  // const { isAuthenticated, expert } = useAuth();
  
  // Mock values for testing
  const isAuthenticated = true;
  const expert = { onboarding_completed: true };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Only fetch chat history if onboarding is completed
    if (expert?.onboarding_completed) {
      fetchChatHistory();
    } else {
      navigate('/onboarding');
    }
  }, [isAuthenticated, expert?.onboarding_completed, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getChatHistory();
      
      // Filter out any START_TRAINING messages
      const filteredMessages = response.messages.filter((msg: Message) => 
        msg.content !== 'START_TRAINING'
      );
      
      if (filteredMessages.length === 0) {
        // No messages yet, show instructions first
        setShowInstructions(true);
        setHasStartedTraining(false);
      } else {
        // Has existing messages, skip instructions
        setMessages(filteredMessages);
        setShowInstructions(false);
        setHasStartedTraining(true);
      }
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch chat history';
      
      if (errorMessage.includes('complete onboarding first')) {
        navigate('/onboarding');
      } else {
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 4000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const startTrainingSession = async () => {
    setShowInstructions(false);
    setLoading(true);
    
    try {
      console.log('Starting new training conversation...');
      const initialResponse = await trainingService.sendMessage('START_TRAINING');
      console.log('Received initial AI response:', initialResponse);
      if (initialResponse.message) {
        setMessages([initialResponse.message]);
        setHasStartedTraining(true);
      } else {
        console.error('No message in initial response:', initialResponse);
        enqueueSnackbar('Failed to start training conversation', { 
          variant: 'error',
          autoHideDuration: 4000
        });
      }
    } catch (error) {
      console.error('Error starting training:', error);
      enqueueSnackbar('Failed to start training conversation', { 
        variant: 'error',
        autoHideDuration: 4000
      });
      setShowInstructions(true); // Show instructions again on error
    } finally {
      setLoading(false);
    }
  };

  const handleSkipInstructions = () => {
    setShowInstructions(false);
    setHasStartedTraining(true);
    // Don't start training automatically, just show empty chat
  };

  // Show instructions if we haven't started training yet
  if (showInstructions && !hasStartedTraining) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <OnboardingInstructions 
          onStart={startTrainingSession}
          onSkip={handleSkipInstructions}
        />
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Add the user's message immediately
      const userMessage: Message = {
        id: Date.now(), // Temporary ID
        role: 'expert',
        content: message,
        created_at: new Date().toISOString(),
        context_depth: messages.length > 0 ? messages[messages.length - 1].context_depth : 1,
        knowledge_area: messages.length > 0 ? messages[messages.length - 1].knowledge_area : ''
      };
      
      // Don't show temporary messages that might be commands
      if (!['START_TRAINING', 'SKIP_TOPIC'].includes(message.toUpperCase())) {
        setMessages(prev => [...prev, userMessage]);
      }
      
      const response = await trainingService.sendMessage(message);
      
      if (response.message) {
        // Update messages, handling both user message and AI response
        setMessages(prev => {
          // Remove temporary user message if it exists
          const baseMessages = prev.filter(msg => msg.id !== userMessage.id);
          
          // Add both messages if not a command
          if (!['START_TRAINING', 'SKIP_TOPIC'].includes(message.toUpperCase())) {
            return [...baseMessages, 
              {
                ...userMessage,
                id: response.message.id - 1 // Use server-assigned ID - 1 for user message
              },
              response.message
            ];
          }
          
          // Just add AI response for commands
          return [...baseMessages, response.message];
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setInput(message); // Restore the message in case of error
      
      // Remove the temporary user message
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()));

      const errorMessage = error.response?.data?.error || 'Failed to send message';
      enqueueSnackbar(errorMessage, {
        variant: 'error',
        autoHideDuration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await trainingService.sendMessage('SKIP_TOPIC');
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      console.error('Error skipping topic:', error);
      enqueueSnackbar('Failed to skip topic', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getContextDepthLabel = (depth: number) => {
    const labels = ['Basic', 'Intermediate', 'Detailed', 'Advanced', 'Expert'];
    return labels[depth - 1] || 'Unknown';
  };

  const renderTopicTransition = (message: Message, prevMessage?: Message) => {
    if (message.role !== 'ai' || !message.conversation_state) return null;
    
    const isNewTopic = !message.conversation_state.is_follow_up && 
                      (!prevMessage?.knowledge_area || 
                       prevMessage.knowledge_area !== message.knowledge_area);

    if (isNewTopic) {
      return (
        <Box sx={{ 
          py: 2, 
          px: 3, 
          bgcolor: 'background.paper',
          borderLeft: 3,
          borderColor: 'primary.main',
          my: 2,
          borderRadius: 1
        }}>
          <Typography variant="subtitle2" color="primary">
            New Topic: {message.knowledge_area}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Training Chat
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          Share your expertise through natural conversation. The AI will guide you through various topics,
          starting with broad concepts and gradually exploring specific details. Feel free to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mt: 1 }}>
          <Typography component="li">Skip topics that don't interest you</Typography>
          <Typography component="li">Ask questions when you need clarification</Typography>
          <Typography component="li">Introduce new topics you'd like to discuss</Typography>
        </Box>
      </Paper>

      <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Container */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages
              .filter(msg => msg.content !== 'START_TRAINING')
              .map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : undefined;
                return (
                  <React.Fragment key={message.id}>
                    {renderTopicTransition(message, prevMessage)}
                    {index > 0 && !renderTopicTransition(message, prevMessage) && <Divider />}
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: message.role === 'expert' ? 'flex-end' : 'flex-start',
                        py: 1
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '80%',
                          bgcolor: message.role === 'expert' ? 'primary.main' : 'grey.100',
                          color: message.role === 'expert' ? 'white' : 'text.primary',
                          borderRadius: 2,
                          p: 2,
                          mb: 1
                        }}
                      >
                        <Typography variant="body1">
                          {message.content}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'center',
                          alignSelf: message.role === 'expert' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          {formatTimestamp(message.created_at)}
                        </Typography>
                      </Box>
                    </ListItem>
                  </React.Fragment>
                );
              })}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            placeholder="Share your knowledge..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleSkip}
              disabled={loading}
            >
              New Topic
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !input.trim()}
            >
              {loading ? <CircularProgress size={24} /> : 'Send'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}; 