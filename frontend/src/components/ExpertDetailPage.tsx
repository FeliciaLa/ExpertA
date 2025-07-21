import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Divider,
  Button,
  Container,
  TextField,
  Tooltip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';

interface ExpertProfile {
  industry?: string;
  years_of_experience?: string;
  key_skills?: string;
  typical_problems?: string;
  methodologies?: string;
  tools_technologies?: string;
  monetization_enabled?: boolean;
  monetization_price?: number;
}

interface ExpertDetail {
  id: string;
  name: string;
  email: string;
  specialties: string;
  bio: string;
  title?: string;
  profile_image: string | null;
  profile: ExpertProfile | null;
}

export const ExpertDetailPage: React.FC = () => {
  const { expertId } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { isUser, signIn, register, isAuthenticated, user } = useAuth();

  useEffect(() => {
    const fetchExpertDetails = async () => {
      if (!expertId || expertId === 'undefined') {
        console.error('Invalid expert ID:', expertId);
        setError('Expert not found. Please go back to the expert list.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching expert details for ID:', expertId);
      try {
        setLoading(true);
        setError(null);
        
        // Debug: Log the exact URL we're about to call
        console.log('API call URL:', `experts/${expertId}/`);
        console.log('API baseURL:', api.defaults.baseURL);
        
        const response = await api.get(`experts/${expertId}/`);
        console.log('Expert details response:', response.data);
        
        // Validate that we received valid data with an ID
        if (!response.data || !response.data.id) {
          console.error('Received invalid expert data:', response.data);
          setError('Invalid expert data received. Please try again.');
          setLoading(false);
          return;
        }
        
        setExpert({
          id: response.data.id,
          name: response.data.name || 'Unknown Expert',
          email: response.data.email || '',
          specialties: response.data.specialties || '',
          bio: response.data.bio || '',
          title: response.data.title || '',
          profile_image: response.data.profile_image,
          profile: response.data.profile
        });
      } catch (err: any) {
        console.error('Failed to fetch expert details:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        // Set different error messages based on the error type
        setError(err.response?.status === 404 
          ? 'Expert not found. Please go back to the expert list.'
          : 'Failed to load expert details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpertDetails();
  }, [expertId]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">Loading expert details...</Typography>
        </Box>
      </Container>
    );
  }

  if (error || !expert) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button 
          onClick={() => navigate('/experts')}
          sx={{ mb: 3 }}
        >
          ← Back to Experts
        </Button>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error || 'Expert not found'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/experts')}
            sx={{ mt: 2 }}
          >
            Browse All Experts
          </Button>
        </Paper>
      </Container>
    );
  }

  // Function to get the correct image URL
  const getProfileImageUrl = () => {
    if (!expert.profile_image) return '';
    
    // Handle both relative and absolute URLs
    if (expert.profile_image.startsWith('http')) {
      return expert.profile_image;
    }
    
    // Use the API URL from the api service
    return `${api.defaults.baseURL}${expert.profile_image}`;
  };

  // Handle user sign in
  const handleUserSignIn = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password, false); // false indicates user login, not expert
      if (result.success) {
        setIsAuthDialogOpen(false);
      }
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
      if (result.success) {
        setIsAuthDialogOpen(false);
      }
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  // Render chat or login prompt based on authentication
  const renderChatSection = () => {
    // Simple check: if authenticated (user OR expert), allow chat with ANY AI
    if (isAuthenticated) {
      return (
        <Chat 
          expertId={expert.id} 
          expertName={expert.name}
          monetizationEnabled={expert.profile?.monetization_enabled || false}
          expertPrice={Number(expert.profile?.monetization_price) || 5}
        />
      );
    }
    
    // Sample preview messages to show when not logged in
    const previewMessages = [
      { role: 'user', content: 'What can I ask you?' },
      { role: 'assistant', content: `I'm here to help with anything in my area of expertise — from quick advice to deep dives into complex topics.` }
    ];

    // Show preview chat interface for non-logged in users
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
          {/* Show preview messages for non-logged in users */}
          {previewMessages.map((message, index) => (
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
          
          <Box sx={{ textAlign: 'center', p: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              This is a preview of the chat. {' '}
              <Box 
                component="span" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAuthDialogOpen(true);
                }}
                sx={{ 
                  color: '#1976d2', 
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 500,
                  '&:hover': {
                    color: '#1565c0',
                  }
                }}
              >
                Sign in
              </Box>
              {' '} to continue the conversation.
            </Typography>
          </Box>
        </Box>

        <Box 
          component="div" 
          onClick={() => setIsAuthDialogOpen(true)}
          sx={{ 
            width: '100%',
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            cursor: 'pointer'
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Sign in to chat with this expert"
            size="medium"
            InputProps={{
              readOnly: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#f8f9fa',
                cursor: 'pointer'
              },
              '&:hover .MuiOutlinedInput-root': {
                backgroundColor: '#f0f0f0',
                borderColor: '#1976d2'
              },
              '& .MuiInputBase-input': {
                cursor: 'pointer'
              },
              cursor: 'pointer'
            }}
          />
        </Box>
      </>
    );
  };

  // Check if this is The Stoic Mentor for special layout
  const isStoicMentor = expert?.name === 'The Stoic Mentor';

  // Special layout for The Stoic Mentor - Standard layout with Stoic theming
  if (isStoicMentor) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, bgcolor: '#f4f1e8', minHeight: '100vh' }}>
        {/* Condensed Stoic Hero Header */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          color: '#f4f1e8',
          p: 4,
          borderRadius: 3,
          mb: 4,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(44, 62, 80, 0.3)'
        }}>
          <Typography variant="h3" gutterBottom sx={{ 
            fontWeight: 'bold', 
            fontFamily: '"Times New Roman", serif',
            letterSpacing: '0.5px'
          }}>
            🏛️ The Stoic Mentor
          </Typography>
          <Typography variant="h6" sx={{ 
            opacity: 0.9, 
            mb: 2, 
            fontStyle: 'italic',
            color: '#d4af37'
          }}>
            Your Guide to Ancient Wisdom and Modern Resilience
          </Typography>
          <Typography variant="body1" sx={{ 
            maxWidth: 600, 
            mx: 'auto', 
            opacity: 0.9,
            fontFamily: '"Times New Roman", serif'
          }}>
            "Grounded in the timeless teachings of Marcus Aurelius, Seneca, and Epictetus."
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Stoic Expert Profile Section */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ 
              p: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              color: '#f4f1e8',
              boxShadow: '0 4px 20px rgba(44, 62, 80, 0.2)',
              border: '1px solid #d4af37'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={getProfileImageUrl()}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: '#d4af37',
                    color: '#2c3e50',
                    fontSize: '2rem',
                    mr: 2,
                    border: '3px solid #d4af37',
                    boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  🏛️
                </Avatar>
                <Box>
                  <Typography variant="h5" gutterBottom sx={{ 
                    color: '#d4af37', 
                    fontWeight: 600,
                    fontFamily: '"Times New Roman", serif'
                  }}>
                    {expert.name}
                  </Typography>
                  {expert.title && (
                    <Typography variant="subtitle1" sx={{ 
                      color: 'rgba(244,241,232,0.9)', 
                      fontStyle: 'italic',
                      fontFamily: '"Times New Roman", serif'
                    }}>
                      {expert.title}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2, borderColor: '#d4af37' }} />

              <Typography variant="h6" gutterBottom sx={{ 
                color: '#d4af37',
                fontFamily: '"Times New Roman", serif',
                fontWeight: 'bold'
              }}>
                🏛️ About Your Mentor
              </Typography>
              <Typography paragraph sx={{ 
                color: 'rgba(244,241,232,0.95)', 
                lineHeight: 1.7,
                fontFamily: '"Times New Roman", serif'
              }}>
                {expert.bio || 'No bio available'}
              </Typography>

              <Box sx={{ 
                mt: 3, 
                p: 3, 
                bgcolor: 'rgba(212,175,55,0.15)', 
                borderRadius: 2,
                border: '1px solid rgba(212,175,55,0.3)',
                boxShadow: 'inset 0 2px 4px rgba(212,175,55,0.1)'
              }}>
                <Typography variant="body2" sx={{ 
                  fontStyle: 'italic', 
                  color: '#d4af37',
                  fontFamily: '"Times New Roman", serif',
                  fontSize: '1rem',
                  fontWeight: 500
                }}>
                  "You have power over your mind - not outside events. Realize this, and you will find strength."
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(244,241,232,0.8)', 
                  mt: 1, 
                  display: 'block',
                  fontFamily: '"Times New Roman", serif',
                  textAlign: 'right'
                }}>
                  — Marcus Aurelius, Meditations
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Stoic Chat Section */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ 
              p: 3, 
              height: '100%', 
              minHeight: '600px',
              bgcolor: '#f4f1e8',
              border: '1px solid #d4af37',
              boxShadow: '0 4px 20px rgba(44, 62, 80, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ 
                  width: 50, 
                  height: 50, 
                  bgcolor: '#2c3e50', 
                  mr: 2,
                  fontSize: '1.5rem',
                  border: '2px solid #d4af37'
                }}>
                  🏛️
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ 
                    color: '#2c3e50', 
                    fontWeight: 600,
                    fontFamily: '"Times New Roman", serif'
                  }}>
                    Chat with {expert.name}'s AI
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#34495e',
                    fontStyle: 'italic',
                    fontFamily: '"Times New Roman", serif'
                  }}>
                    Seek wisdom on philosophy, resilience, leadership, and life guidance
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ height: 'calc(100% - 80px)' }}>
                {renderChatSection()}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <UserAuthDialog
          open={isAuthDialogOpen}
          onClose={() => setIsAuthDialogOpen(false)}
          onSignIn={handleUserSignIn}
          onRegister={handleUserRegister}
        />
      </Container>
    );
  }

  // Default layout for all other experts
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        onClick={() => navigate('/experts')}
        sx={{ mb: 3 }}
      >
        ← Back to Experts
      </Button>
      
      <Grid container spacing={4}>
        {/* Expert Profile Section */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={getProfileImageUrl()}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  mr: 2
                }}
              >
                {expert.name[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {expert.name}
                </Typography>
                {expert.title && (
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {expert.title}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Typography paragraph>
              {expert.bio || 'No bio available'}
            </Typography>

            {/* Monetization Info */}
            {expert.profile?.monetization_enabled && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  💡 This expert offers paid consultations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  3 free questions, then £{((Number(expert.profile.monetization_price) || 5) * 1.2).toFixed(2)} for 15-min session
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Chat Section */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Always show the title, regardless of authentication state */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 500 }}>
                Chat with {expert.name}'s AI
              </Typography>
              <Tooltip 
                title="This chatbot is AI-powered and still in development. Responses may be inaccurate or incomplete."
                placement="right"
                arrow
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'rgba(0, 0, 0, 0.87)',
                      color: 'white',
                      fontSize: '0.875rem',
                      maxWidth: 300,
                      padding: '8px 16px',
                      borderRadius: '4px',
                    }
                  }
                }}
              >
                <Typography 
                  component="span" 
                  sx={{ 
                    fontSize: '1.2rem',
                    color: 'text.secondary',
                    cursor: 'help',
                    lineHeight: 1,
                    '&:hover': {
                      color: 'primary.main',
                    }
                  }}
                >
                  ℹ️
                </Typography>
              </Tooltip>
            </Box>
            {renderChatSection()}
          </Paper>
        </Grid>
      </Grid>

      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
      />
    </Container>
  );
};

export default ExpertDetailPage; 