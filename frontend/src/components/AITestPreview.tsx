import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Paper,
  Avatar,
  Chip,
  Divider,
  TextField,
  Button,
  Alert
} from '@mui/material';
import {
  Close,
  Science,
  Chat,
  Send,
  Visibility
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/api';

interface AITestPreviewProps {
  open: boolean;
  onClose: () => void;
}

const AITestPreview: React.FC<AITestPreviewProps> = ({ open, onClose }) => {
  const { expert } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'ai'}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendTestMessage = async () => {
    if (!testMessage.trim() || !expert?.id) return;

    const userMessage = {
      id: Date.now(),
      text: testMessage,
      sender: 'user' as const
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = testMessage;
    setTestMessage('');
    setIsLoading(true);

    try {
      // Use the actual chat API - same as the live expert
      console.log('Sending test message to AI:', { message: messageToSend, expertId: expert.id });
      const response = await chatService.sendMessage(messageToSend, expert.id);
      console.log('AI Test Response:', response);
      
      const aiResponse = {
        id: Date.now() + 1,
        text: response.answer,
        sender: 'ai' as const
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error('AI Test Error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Sorry, I\'m having trouble responding right now. Please try again.';
      
      const errorResponse = {
        id: Date.now() + 1,
        text: `🔬 Test Error: ${errorMessage}`,
        sender: 'ai' as const
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTestMessage();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '80vh',
          maxHeight: '800px'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderBottom: '2px solid rgba(102, 126, 234, 0.2)'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Science color="primary" />
                     <Box>
             <Typography variant="h6" component="div">
               🔬 Real AI Test Mode
             </Typography>
             <Typography variant="caption" color="text.secondary">
               Your actual AI expert - Private testing only
             </Typography>
           </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                 {/* Preview Warning */}
         <Alert severity="success" sx={{ m: 2, mb: 0 }}>
           <strong>Real AI Test:</strong> This is your actual AI expert responding in private test mode. Responses are identical to the live version.
         </Alert>

        {/* Expert Preview Header */}
        <Paper sx={{ m: 2, p: 3, bgcolor: 'grey.50' }}>
          <Box display="flex" alignItems="center" gap={3}>
            <Avatar 
              sx={{ 
                width: 60, 
                height: 60, 
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
            >
              {expert?.name?.charAt(0) || 'E'}
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {expert?.name || 'Expert Name'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {expert?.title || 'Professional Expert'}
              </Typography>
              <Chip 
                label="🔬 PREVIEW MODE" 
                color="primary" 
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <Visibility sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
            You're testing how users will interact with your AI expert
          </Typography>
        </Paper>

        {/* Chat Interface */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mx: 2, mb: 2 }}>
          {/* Messages Area */}
          <Paper 
            sx={{ 
              flex: 1, 
              p: 2, 
              mb: 2, 
              overflow: 'auto',
              minHeight: 300,
              bgcolor: 'background.default'
            }}
          >
            {messages.length === 0 ? (
                             <Box textAlign="center" py={4}>
                 <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                 <Typography variant="h6" color="text.secondary" gutterBottom>
                   Test Your Real AI Expert
                 </Typography>
                 <Typography variant="body2" color="text.secondary">
                   This connects to your actual AI - responses are identical to the live version
                 </Typography>
               </Box>
            ) : (
              <Box>
                {messages.map((message) => (
                  <Box 
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                        color: message.sender === 'user' ? 'white' : 'text.primary'
                      }}
                    >
                      <Typography variant="body2">
                        {message.text}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
                {isLoading && (
                  <Box display="flex" justifyContent="flex-start" mb={2}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                      <Typography variant="body2" color="text.secondary">
                        🤖 AI is thinking...
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </Paper>

          {/* Message Input */}
          <Box display="flex" gap={1}>
                         <TextField
               fullWidth
               placeholder="Chat with your real AI expert..."
               value={testMessage}
               onChange={(e) => setTestMessage(e.target.value)}
               onKeyPress={handleKeyPress}
               multiline
               maxRows={3}
               disabled={isLoading}
             />
            <Button
              variant="contained"
              onClick={handleSendTestMessage}
              disabled={!testMessage.trim() || isLoading}
              sx={{ minWidth: 60 }}
            >
              <Send />
            </Button>
          </Box>

                     <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
             💡 You're chatting with your real AI expert! Responses are identical to the live version - this is just private testing.
           </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AITestPreview; 