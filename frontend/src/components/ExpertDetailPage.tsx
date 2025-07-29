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
  IconButton,
  CircularProgress
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBack from '@mui/icons-material/ArrowBack';
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

  // Function to get the correct image URL
  const getProfileImageUrl = () => {
    if (!expert?.profile_image) return '';
    
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
      const result = await register(name, email, password, false, 'user');
      setIsAuthDialogOpen(false);
      return result;
    } catch (error) {
      throw error;
    }
  };

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

  const handleSignOut = () => {
    signOut();
    // Stay on current expert page after logout
    setIsAuthDialogOpen(false);
  };

  const renderChat = () => {
    if (!expert) return null;
    
    return (
      <Chat
        key={expert.id}
        expertId={expert.id}
        expertName={expert.name}
        monetizationEnabled={false}
        expertPrice={5}
        expertProfileImage={getProfileImageUrl()}
      />
    );
  };

  const previewMessages = [
    {
      role: 'assistant' as const,
      content: `Hello! I'm ${expert?.name || 'the expert'}'s AI assistant. I'm trained on their knowledge and experience. Feel free to ask me anything about their area of expertise!`
    },
    {
      role: 'user' as const,
      content: "What's your background and experience?"
    },
    {
      role: 'assistant' as const,
      content: `I have extensive knowledge in ${expert?.specialties || 'my field'} and I'm here to help you with detailed, expert-level guidance. What specific questions do you have?`
    }
  ];

  const handleExpertClick = (expertId: string) => {
    navigate(`/experts/${expertId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!expert) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Expert not found</Typography>
        <Button variant="outlined" onClick={() => navigate('/experts')}>
          Browse Experts
        </Button>
      </Box>
    );
  }

  // Default layout for all experts  
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
              {renderChat()}
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
    </Box>
  );
};

export default ExpertDetailPage; 