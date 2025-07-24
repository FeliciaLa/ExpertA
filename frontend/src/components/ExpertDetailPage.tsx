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
  Tooltip,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';
import { features } from '../utils/environment';

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
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const { isUser, signIn, register, isAuthenticated, user, signOut } = useAuth();

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
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error || 'Expert not found'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Go to Home
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

  // Profile dropdown handlers
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/user/profile');
  };

  const handleLogoutClick = () => {
    handleProfileMenuClose();
    signOut();
    // Stay on The Stoic Mentor page after logout
  };



  // Render chat or login prompt based on authentication
  const renderChatSection = () => {
    // For The Stoic Mentor, require authentication (monetized expert)
    // For all other experts, allow direct chat access
    if (isAuthenticated || expert?.name !== 'The Stoic Mentor') {
      return (
        <Chat 
          expertId={expert.id} 
          expertName={expert.name}
              monetizationEnabled={expert.name === 'The Stoic Mentor' ? true : false}
              expertPrice={expert.name === 'The Stoic Mentor' ? 1.99 : 5}
              expertProfileImage={getProfileImageUrl()}
        />
      );
    }
    
    // Sample preview messages to show when not logged in
    const previewMessages = expert?.name === 'The Stoic Mentor' ? [
      { role: 'user', content: 'How can I find peace when everything feels chaotic?' },
      { role: 'assistant', content: `Remember, as Marcus Aurelius taught us: "You have power over your mind - not outside events. Realize this, and you will find strength." Focus on what is within your control - your thoughts, your responses, your character. The chaos around you cannot disturb your inner citadel unless you allow it entry.` }
    ] : [
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
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              {/* Show expert avatar only for assistant messages */}
              {message.role === 'assistant' && (
                <Avatar
                  src={getProfileImageUrl()}
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '1rem',
                    bgcolor: expert.name === 'The Stoic Mentor' ? '#d4af37' : 'primary.main',
                    color: expert.name === 'The Stoic Mentor' ? '#2c3e50' : 'white',
                    mt: 0.5,
                    flexShrink: 0
                  }}
                >
                  {expert.name === 'The Stoic Mentor' ? '🏛️' : expert.name[0]}
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

          {/* Sign-in field inside the chat preview box */}
        <Box 
          component="div" 
          onClick={() => setIsAuthDialogOpen(true)}
          sx={{ 
            width: '100%',
              borderTop: '1px solid #e0e0e0',
              pt: 2,
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
        </Box>
      </>
    );
  };

  // Check if this is The Stoic Mentor for special layout
  const isStoicMentor = expert?.name === 'The Stoic Mentor';

  // Special layout for The Stoic Mentor - Full viewport background
  if (isStoicMentor) {
    return (
      <Box sx={{
        minHeight: '100vh',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        paddingBottom: '100px',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url("/Temple image.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -2
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(244, 241, 232, 0.85)',
          zIndex: -1
        }
      }}>
        <Container maxWidth="lg" sx={{ 
          py: 4,
          position: 'relative',
          zIndex: 1,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
        
        {/* Custom Profile Dropdown for Stoic Mentor */}
        {isAuthenticated && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10
          }}>
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                bgcolor: 'rgba(44, 62, 80, 0.9)',
                color: '#d4af37',
                border: '2px solid #d4af37',
                '&:hover': {
                  bgcolor: 'rgba(44, 62, 80, 1)',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                },
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              <AccountCircleIcon />
            </IconButton>
            
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1,
                  bgcolor: 'rgba(44, 62, 80, 0.95)',
                  color: '#f4f1e8',
                  border: '1px solid #d4af37',
                  '& .MuiMenuItem-root': {
                    color: '#f4f1e8',
                    fontFamily: '"Times New Roman", serif',
                    '&:hover': {
                      bgcolor: 'rgba(212, 175, 55, 0.2)'
                    }
                  }
                }
              }}
            >
              <MenuItem onClick={handleProfileClick}>
                <PersonIcon sx={{ mr: 1, color: '#d4af37' }} />
                My Profile
              </MenuItem>
              <MenuItem onClick={handleLogoutClick}>
                <LogoutIcon sx={{ mr: 1, color: '#d4af37' }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
        
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

        <Grid container spacing={3}>
          {/* Stoic Expert Profile Section */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3, 
              minHeight: '600px',
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
          <Grid item xs={12} md={8}>
            <Paper sx={{ 
              p: 3, 
              minHeight: '600px',
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              color: '#f4f1e8',
              border: '1px solid #d4af37',
              boxShadow: '0 4px 20px rgba(44, 62, 80, 0.2)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ 
                  width: 50, 
                  height: 50, 
                  bgcolor: '#d4af37', 
                  color: '#2c3e50',
                  mr: 2,
                  fontSize: '1.5rem',
                  border: '2px solid #d4af37',
                  boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)'
                }}>
                  🏛️
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ 
                    color: '#d4af37', 
                    fontWeight: 600,
                    fontFamily: '"Times New Roman", serif'
                  }}>
                    Chat with {expert.name}'s AI
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(244,241,232,0.9)',
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

        {expert?.name === 'The Stoic Mentor' && (
          <UserAuthDialog
            open={isAuthDialogOpen}
            onClose={() => setIsAuthDialogOpen(false)}
            onSignIn={handleUserSignIn}
            onRegister={handleUserRegister}
          />
        )}


        </Container>
      </Box>
    );
  }

  // Default layout for all other experts  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: 4
    }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
        <Grid container spacing={6}>
        {/* Expert Profile Section */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              height: 'fit-content',
              minHeight: '400px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              zIndex: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={getProfileImageUrl()}
                sx={{
                  width: 90,
                  height: 90,
                  bgcolor: 'primary.main',
                  fontSize: '2.2rem',
                  mr: 2,
                  border: '3px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }}
              >
                {expert.name[0]}
              </Avatar>
              <Box>
                <Typography 
                  variant="h4" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {expert.name}
                </Typography>
                {expert.title && (
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontWeight: 500 }}
                  >
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
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 0, 
              minHeight: '600px', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1
            }}
          >
            {/* Chat Header */}
            <Box sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600,
                  color: '#1976d2',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2
                }}
              >
                                Chat with {expert.name}'s AI
                <Box sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  borderRadius: 2, 
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px'
                }}>
                  AI POWERED
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Get expert insights powered by {expert.name}'s knowledge and experience
                </Typography>
            </Box>
            
                         {/* Chat Content */}
             <Box sx={{ flex: 1, p: 3 }}>
            {renderChatSection()}
             </Box>
          </Paper>
        </Grid>
      </Grid>

      {expert?.name === 'The Stoic Mentor' && (
      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
      />
      )}
    </Container>
    </Box>
  );
};

export default ExpertDetailPage; 