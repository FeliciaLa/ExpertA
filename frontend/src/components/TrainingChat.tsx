import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItem,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';

interface Message {
  id: number;
  role: 'ai' | 'expert';
  content: string;
  created_at: string;
  context_depth: number;
  knowledge_area: string;
}

export const TrainingChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, expert } = useAuth();

  // Simple error handling without external dependencies
  const showError = (message: string) => {
    console.error('Training error:', message);
    alert(message); // Simple alert for now
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    if (!expert?.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    // Fetch existing chat history or start new training
    fetchChatHistory();
  }, [isAuthenticated, expert?.onboarding_completed, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      setInitializing(true);
      const response = await trainingService.getChatHistory();
      
      // Filter out any START_TRAINING messages
      const filteredMessages = response.messages.filter((msg: Message) => 
        msg.content !== 'START_TRAINING'
      );
      
      if (filteredMessages.length === 0) {
        // No messages yet, start training automatically
        await startTrainingSession();
      } else {
        // Has existing messages
        setMessages(filteredMessages);
      }
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch chat history';
      
      if (errorMessage.includes('complete onboarding first')) {
        navigate('/onboarding');
      } else {
        showError(errorMessage);
      }
    } finally {
      setInitializing(false);
    }
  };

  const startTrainingSession = async () => {
    try {
      console.log('Starting new training conversation...');
      const initialResponse = await trainingService.sendMessage('START_TRAINING');
      console.log('Received initial AI response:', initialResponse);
      
      if (initialResponse.message) {
        setMessages([initialResponse.message]);
      } else {
        console.error('No message in initial response:', initialResponse);
        showError('Failed to start training conversation');
      }
    } catch (error) {
      console.error('Error starting training:', error);
      showError('Failed to start training conversation');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      
      setMessages(prev => [...prev, userMessage]);
      
      const response = await trainingService.sendMessage(message);
      
      if (response.message) {
        // Update messages with server response
        setMessages(prev => {
          // Remove temporary user message and add both messages with server IDs
          const baseMessages = prev.filter(msg => msg.id !== userMessage.id);
          return [...baseMessages, 
            {
              ...userMessage,
              id: response.message.id - 1 // Use server-assigned ID - 1 for user message
            },
            response.message
          ];
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setInput(message); // Restore the message in case of error
      
      // Remove the temporary user message
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()));

      const errorMessage = error.response?.data?.error || 'Failed to send message';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTopic = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await trainingService.sendMessage('SKIP_TOPIC');
      if (response.message) {
        setMessages(prev => [...prev, response.message]);
      }
    } catch (error) {
      console.error('Error skipping topic:', error);
      showError('Failed to skip topic');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please log in to access training.</Typography>
      </Box>
    );
  }

  if (!expert?.onboarding_completed) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please complete your expert onboarding first.</Typography>
        <Button onClick={() => navigate('/onboarding')} variant="contained" sx={{ mt: 2 }}>
          Complete Onboarding
        </Button>
      </Box>
    );
  }

  if (initializing) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Initializing AI training session...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Training Chat
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          Share your expertise through natural conversation. The AI will guide you through various topics,
          starting with broad concepts and gradually exploring specific details.
        </Typography>
      </Paper>

      <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Container */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages
              .filter(msg => msg.content !== 'START_TRAINING')
              .map((message, index) => (
                <React.Fragment key={message.id}>
                  {index > 0 && <Divider />}
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
                    <Typography variant="caption" color="textSecondary">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </Typography>
                  </ListItem>
                </React.Fragment>
              ))}
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
              onClick={handleNewTopic}
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