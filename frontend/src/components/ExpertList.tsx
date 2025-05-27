import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress,
  Container,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';

interface Expert {
  id: string;
  name: string;
  specialties: string;
  bio: string;
  email: string;
  title?: string;
  profile_image: string | null;
}

export const ExpertList: React.FC = () => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { isUser, signIn, register } = useAuth();

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try the public-experts endpoint which should be accessible to all
        try {
          const response = await api.get('/api/public-experts/');
          console.log('Experts data:', response.data);
          
          // Make sure response.data is an array before using forEach
          if (Array.isArray(response.data)) {
            // Debug each expert's ID
            response.data.forEach((expert: Expert, index: number) => {
              console.log(`Expert ${index} (${expert.name}), ID:`, expert.id);
              console.log(`Expert ${index} full object:`, expert);
            });
            setExperts(response.data);
          } else {
            console.error('Response data is not an array:', response.data);
            throw new Error('Invalid response format');
          }
        } catch (publicError) {
          // If that fails, try the fallback experts endpoint
          console.warn('Failed to fetch from public endpoint, trying fallback:', publicError);
          try {
            const fallbackResponse = await api.get('/api/experts/');
            console.log('Fallback experts data:', fallbackResponse.data);
            
            // Make sure fallbackResponse.data is an array before using forEach
            if (Array.isArray(fallbackResponse.data)) {
              // Debug each expert's ID from fallback
              fallbackResponse.data.forEach((expert: Expert, index: number) => {
                console.log(`Expert ${index} (${expert.name}), ID:`, expert.id);
                console.log(`Expert ${index} full object:`, expert);
              });
              setExperts(fallbackResponse.data);
            } else {
              console.error('Fallback response data is not an array:', fallbackResponse.data);
              throw new Error('Invalid fallback response format');
            }
          } catch (fallbackError) {
            console.error('All endpoints failed:', fallbackError);
            setError('Failed to load experts. Please refresh the page or try again later.');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch experts:', err);
        setError('Failed to load experts. Please refresh the page or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  const filteredExperts = experts.filter(expert =>
    expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expert.specialties?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExpertClick = (expertId: string) => {
    // Check if expertId is undefined or empty
    if (!expertId || expertId === 'undefined') {
      console.error('Invalid expert ID, cannot navigate:', expertId);
      // Show an error or fallback behavior
      return;
    }
    
    console.log('Navigating to expert with ID:', expertId);
    // Navigate to expert detail page regardless of authentication status
    navigate(`/experts/${expertId}`);
  };

  const handleChatButtonClick = (e: React.MouseEvent, expertId: string) => {
    e.stopPropagation(); // Prevent card click event
    
    // Check if expertId is undefined or empty
    if (!expertId || expertId === 'undefined') {
      console.error('Invalid expert ID, cannot navigate:', expertId);
      return;
    }
    
    if (!isUser) {
      // Show login dialog if user is not authenticated
      setIsAuthDialogOpen(true);
    } else {
      navigate(`/experts/${expertId}`);
    }
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

  // Function to get the correct image URL
  const getProfileImageUrl = (profileImage: string | null) => {
    if (!profileImage) return '';
    
    // Handle both relative and absolute URLs
    if (profileImage.startsWith('http')) {
      return profileImage;
    }
    
    // Use a hardcoded API URL for development
    return `${api.defaults.baseURL}${profileImage}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ my: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Our Experts
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Browse our experts and connect with their AI
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name or specialty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 4 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Grid container spacing={4}>
          {filteredExperts.map((expert) => (
            <Grid item xs={12} sm={6} md={4} key={expert.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                  cursor: 'pointer',
                }}
                onClick={() => handleExpertClick(expert.id)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Avatar
                    src={getProfileImageUrl(expert.profile_image)}
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: 'primary.main',
                      fontSize: '3rem',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    {expert.name[0]}
                  </Avatar>
                  <Typography gutterBottom variant="h5" component="div">
                    {expert.name}
                  </Typography>
                  {expert.title && (
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      {expert.title}
                    </Typography>
                  )}
                  {expert.specialties && (
                    <Typography variant="body2" color="text.secondary">
                      {expert.specialties}
                    </Typography>
                  )}
                  <Button 
                    variant="contained" 
                    color="primary" 
                    sx={{ mt: 3 }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleChatButtonClick(e, expert.id);
                    }}
                  >
                    Chat with {expert.name.split(' ')[0]}'s AI
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <UserAuthDialog
        open={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        onSignIn={handleUserSignIn}
        onRegister={handleUserRegister}
      />
    </Container>
  );
};

export default ExpertList; 