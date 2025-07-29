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
    // For all experts, show chat when properly loaded
    if (expert) {
      return (
        <Chat
          key={expert.id}
          expertId={expert.id}
          expertName={expert.name}
          monetizationEnabled={false}
          expertPrice={5}
          expertProfileImage={expert.profile_image || undefined}
        />
      );
    }
    return null;
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

  // Standard layout for all experts
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#f8f9fa'
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid #e0e0e0',
        position: 'sticky',
        top: 0,
        zIndex: 1100
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => navigate('/experts')} edge="start">
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" component="div">
                {expert.name}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isAuthenticated ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {(user?.name || expert?.name || 'U')[0]}
                    </Avatar>
                    <Typography variant="body2">
                      {user?.name || expert?.name}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSignOut}
                    sx={{ textTransform: 'none' }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsAuthDialogOpen(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Sign In
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Expert Info */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                             <Avatar
                 src={expert.profile_image || undefined}
                 sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem',
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                {expert.name[0]}
              </Avatar>
              
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                {expert.name}
              </Typography>
              
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {expert.title || 'Expert'}
              </Typography>

              {expert.specialties && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Specialties
                  </Typography>
                  <Typography variant="body1">
                    {expert.specialties}
                  </Typography>
                </Box>
              )}

              {expert.bio && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    About
                  </Typography>
                  <Typography variant="body2">
                    {expert.bio}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Chat Interface */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {renderChat()}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Auth Dialog */}
      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
      />
    </Box>
  );
};

export default ExpertDetailPage; 