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
import api, { API_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserAuthDialog from './UserAuthDialog';
import { Link } from 'react-router-dom';

// Flag to force using mock data until backend issues are resolved
const FORCE_MOCK_DATA = false;

// Mock data for when backend is not available
const MOCK_EXPERTS = [
  {
    id: "ee9bae34-3039-4141-af4f-4b7a5fcdd43a",
    slug: "sophia-r",
    name: "sophia r",
    email: "sophia@example.com",
    specialties: "marketing",
    bio: "Marketing expert with extensive experience in digital marketing strategies and brand development.",
    title: "marketing expert",
    profile_image: null
  },
  {
    id: "f1234567-8901-2345-6789-abcdef123456",
    slug: "alex-carter",
    name: "Alex Carter",
    email: "alex@example.com",
    specialties: "Business Strategy, Leadership",
    bio: "Senior business strategist with 15+ years experience helping companies scale and optimize operations.",
    title: "Business Strategy Consultant",
    profile_image: null
  }
];

// Standard fetch options with CORS settings
const fetchOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  credentials: 'omit' as RequestCredentials,
  mode: 'cors' as RequestMode
};

// Function to format API URLs properly
const formatApiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Special case for public-experts - use the direct endpoint
  if (cleanPath === 'public-experts' || cleanPath === 'public-experts/') {
    return `${API_URL}public-experts-direct/`;
  }
  
  return `${API_URL}${cleanPath}`;
};

interface Expert {
  id: string;
  slug: string;
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
  const { isUser, isExpert, isAuthenticated, signIn, register } = useAuth();

  useEffect(() => {
    // Debug environment variables
    console.log('Environment variable value:', import.meta.env.VITE_API_URL);
    console.log('Hostname:', window.location.hostname);
    console.log('API URL:', API_URL);
    console.log('Force mock data:', FORCE_MOCK_DATA);
    
    // Add a direct API test without axios to debug the connection
    // Removed automatic endpoint testing that was causing CORS errors
    
    const fetchExperts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching experts using API URL:', API_URL);
        
        // Use mock data if forced
        if (FORCE_MOCK_DATA) {
          console.log('Using mock experts data (forced)');
          setExperts(MOCK_EXPERTS);
          setLoading(false);
          return;
        }
        
        // Try direct fetch to the backend
        try {
          // Use endpoint with trailing slash to match Django URL patterns
          const endpoint = formatApiUrl('public-experts');
          console.log('Fetching from endpoint:', endpoint);
          
          const response = await fetch(endpoint, fetchOptions);
          
          console.log('Response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('Experts data:', data);
          
          if (Array.isArray(data)) {
            data.forEach((expert, index) => {
              console.log(`Expert ${index} (${expert.name}), ID:`, expert.id);
            });
            setExperts(data);
          } else {
            console.error('Response data is not an array:', data);
            throw new Error('Invalid response format');
          }
        } catch (error) {
          console.error('Failed to fetch experts from backend, using mock data:', error);
          setExperts(MOCK_EXPERTS);
        }
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

  const handleExpertClick = (expert: Expert) => {
    // Use slug if available, fallback to ID for backwards compatibility
    const identifier = expert.slug || expert.id;
    
    // Check if identifier is undefined or empty
    if (!identifier || identifier === 'undefined') {
      console.error('Invalid expert identifier, cannot navigate:', identifier);
      // Show an error or fallback behavior
      return;
    }
    
    console.log('Navigating to expert with identifier:', identifier);
    // Navigate to expert detail page regardless of authentication status
    navigate(`/experts/${identifier}`);
  };

  const handleChatButtonClick = (e: React.MouseEvent, expert: Expert) => {
    e.stopPropagation(); // Prevent card click event
    
    // Use slug if available, fallback to ID for backwards compatibility
    const identifier = expert.slug || expert.id;
    
    // Check if identifier is undefined or empty
    if (!identifier || identifier === 'undefined') {
      console.error('Invalid expert identifier, cannot navigate:', identifier);
      return;
    }
    
    // Allow both users and experts to access chat
    if (!isAuthenticated) {
      // Show login dialog if no one is authenticated
      setIsAuthDialogOpen(true);
    } else {
      // Both users and experts can chat with AI
      navigate(`/experts/${identifier}`);
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
                  height: 420, // Fixed height for all cards
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                  },
                  cursor: 'pointer',
                }}
                onClick={() => handleExpertClick(expert)}
              >
                <CardContent sx={{ 
                  flexGrow: 1, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 3
                }}>
                  <Avatar
                    src={getProfileImageUrl(expert.profile_image)}
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    {expert.name[0]}
                  </Avatar>
                  
                  <Typography gutterBottom variant="h6" component="div" sx={{ 
                    fontWeight: 600,
                    minHeight: '1.5rem'
                  }}>
                    {expert.name}
                  </Typography>
                  
                  {expert.title && (
                    <Typography variant="subtitle2" color="primary" gutterBottom sx={{
                      minHeight: '1.25rem',
                      mb: 1
                    }}>
                      {expert.title}
                    </Typography>
                  )}
                  
                  {expert.specialties && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      mb: 2,
                      minHeight: '2.5rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {expert.specialties}
                    </Typography>
                  )}
                  
                  {expert.bio && (
                    <Typography variant="body2" color="text.secondary" sx={{
                      mb: 2,
                      flexGrow: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.875rem',
                      lineHeight: 1.4
                    }}>
                      {expert.bio}
                    </Typography>
                  )}
                  
                  <Box sx={{ mt: 'auto' }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="medium"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        handleChatButtonClick(e, expert);
                      }}
                    >
                      Chat with {expert.name}'s AI
                    </Button>
                  </Box>
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