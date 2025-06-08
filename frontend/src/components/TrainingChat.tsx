import React, { useState, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, expert } = useAuth();

  // Simple error handling without external dependencies
  const showError = (message: string) => {
    console.error('Training error:', message);
    alert(message); // Simple alert for now
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    
    // Add user message to display
    const userMessage: Message = {
      id: Date.now(),
      role: 'expert',
      content: message,
      created_at: new Date().toISOString(),
      context_depth: 1,
      knowledge_area: 'General'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Mock AI response for now
    setTimeout(() => {
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: `Thank you for sharing: "${message}". This is a test response. The full training functionality will be restored once we ensure stability.`,
        created_at: new Date().toISOString(),
        context_depth: 1,
        knowledge_area: 'General'
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
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

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Training Chat
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          Share your expertise through conversation. This is a simplified version while we ensure stability.
        </Typography>
      </Paper>

      <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Container */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message, index) => (
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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