import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useAuth } from '../contexts/AuthContext';
import { userApi, authApi } from '../services/api';
import { API_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

const UserProfilePage: React.FC = () => {
  const { user, setUser, isUser, isExpert } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [name, setName] = useState(user?.name || '');
  const [uploading, setUploading] = useState(false);
  const [userStats, setUserStats] = useState({
    memberSince: '',
    expertsConsulted: 0,
    totalConsultations: 0,
    favoriteCategory: ''
  });
  
  // Account settings state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Consultation data now comes from user.consultations in the API response

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsPageLoading(true);
        
        // Try to use direct access first if we have user data with ID
        const storedUserData = localStorage.getItem('user');
        if (storedUserData) {
          try {
            const parsedUserData = JSON.parse(storedUserData);
            if (parsedUserData.id) {
              console.log('Attempting direct profile fetch with stored user ID:', parsedUserData.id);
              
              // Use the direct endpoint that doesn't require token authentication
              const directResponse = await fetch(`${API_URL}user/profile/direct/${parsedUserData.id}/?nocache=${Date.now()}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                cache: 'no-store'
              });
              
              console.log('Initial direct endpoint response status:', directResponse.status);
              
              if (directResponse.ok) {
                console.log('Direct profile fetch successful');
                const userData = await directResponse.json();
                console.log('User data received from direct endpoint:', userData);
                console.log('DEBUG - date_joined field in API response:', userData.date_joined);
                console.log('DEBUG - typeof date_joined:', typeof userData.date_joined);
                console.log('DEBUG - profile_image field in API response:', userData.profile_image);
                setUser(userData);
                setName(userData.name || '');
                localStorage.setItem('user', JSON.stringify(userData));
                setIsPageLoading(false);
                return; // Exit early if direct fetch was successful
              } else {
                console.log('Direct fetch failed, falling back to token-based authentication');
              }
            }
          } catch (directError) {
            console.error('Error with direct access, falling back to token method:', directError);
          }
        }
        
        // Fall back to token-based authentication if direct access failed or not applicable
        const tokensStr = localStorage.getItem('tokens');
        if (!tokensStr) {
          console.error('No tokens in localStorage');
          setError('No authentication token available');
          setIsPageLoading(false);
          return;
        }
        
        const tokens = JSON.parse(tokensStr);
        if (!tokens.access) {
          console.error('No access token in tokens object');
          setError('Access token missing');
          setIsPageLoading(false);
          return;
        }
        
        // Log tokens and auth role for debugging
        console.log('Using access token:', tokens.access.substring(0, 20) + '...');
        console.log('Auth role from localStorage:', localStorage.getItem('auth_role'));
        
        // Generate a unique cache-busting parameter
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        const nocache = `${timestamp}-${random}`;
        
        console.log('Making direct fetch to user profile endpoint');
        console.log('Authorization header being sent:', `Bearer ${tokens.access.substring(0, 15)}...`);
        
        // Make direct fetch with current token
        const response = await fetch(`${API_URL}user/profile/?nocache=${nocache}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokens.access}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          // Ensure no caching
          cache: 'no-store',
          // Don't use credentials to avoid CORS preflight issues
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log('Profile fetch response status:', response.status);
        
        if (!response.ok) {
          console.error('Failed to fetch profile:', response.status);
          
          if (response.status === 401) {
            console.log('Got 401 unauthorized, trying to refresh token...');
            
            // Try to refresh token explicitly
            try {
              console.log('Attempting to refresh token with endpoint:', `${API_URL}token/refresh/`);
              const refreshResponse = await fetch(`${API_URL}token/refresh/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                body: JSON.stringify({ refresh: tokens.refresh }),
                cache: 'no-store'
              });
              
              console.log('Refresh response status:', refreshResponse.status);
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                console.log('Token refresh successful, got new token');
                
                // Debug logging for new token
                console.log('New token first 20 chars:', refreshData.access.substring(0, 20) + '...');
                
                // Update token in localStorage
                const updatedTokens = {
                  ...tokens,
                  access: refreshData.access
                };
                localStorage.setItem('tokens', JSON.stringify(updatedTokens));
                console.log('Updated token in localStorage');
                
                // Update authorization header
                console.log('Setting Authorization header with new token');
                
                // Retry with new token
                console.log('Retrying profile fetch with new token...');
                console.log('New Authorization header:', `Bearer ${refreshData.access.substring(0, 15)}...`);
                const newTimestamp = new Date().getTime();
                const newRandom = Math.random().toString(36).substring(7);
                const newNocache = `${newTimestamp}-${newRandom}`;
                
                const retryResponse = await fetch(`${API_URL}user/profile/?nocache=${newNocache}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${refreshData.access}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  },
                  cache: 'no-store',
                  // Don't use credentials to avoid CORS preflight issues
                  mode: 'cors',
                  credentials: 'omit'
                });
                
                console.log('Retry response status:', retryResponse.status);
                
                if (retryResponse.ok) {
                  console.log('Profile fetch successful after token refresh');
                                  const userData = await retryResponse.json();
                console.log('User data received:', userData);
                setUser(userData);
                setName(userData.name || '');
                localStorage.setItem('user', JSON.stringify(userData));
                } else {
                  // Retry with fallback direct endpoint if token refresh didn't help
                  console.log('Profile fetch failed after token refresh, trying direct endpoint');

                  try {
                    // Parse user data from localStorage to get the user ID
                    const userData = localStorage.getItem('user');
                    if (!userData) {
                      console.error('No user data in localStorage');
                      throw new Error('User data not found');
                    }
                    
                    const parsedUserData = JSON.parse(userData);
                    if (!parsedUserData.id) {
                      console.error('No user ID in stored user data');
                      throw new Error('User ID not found');
                    }
                    
                    console.log('Using direct access endpoint with user ID:', parsedUserData.id);
                    
                    // Use the direct endpoint that doesn't require token authentication
                    const directResponse = await fetch(`${API_URL}user/profile/direct/${parsedUserData.id}/?nocache=${Date.now()}`, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                      },
                      cache: 'no-store'
                    });
                    
                    console.log('Direct endpoint response status:', directResponse.status);
                    
                    if (directResponse.ok) {
                      console.log('Direct profile fetch successful');
                      const userData = await directResponse.json();
                      console.log('User data received from direct endpoint:', userData);
                      setUser(userData);
                      setName(userData.name || '');
                      localStorage.setItem('user', JSON.stringify(userData));
                    } else {
                      const errorText = await directResponse.text();
                      console.error('Direct profile fetch failed:', errorText);
                      setError('Unable to fetch profile: ' + errorText);
                    }
                  } catch (directError) {
                    console.error('Error using direct endpoint:', directError);
                    setError('Failed to load profile data');
                  }
                }
              } else {
                // Log the full response text for debugging
                const errorText = await refreshResponse.text();
                console.error('Token refresh failed:', errorText);
                setError('Failed to refresh authentication token');
              }
            } catch (refreshError) {
              console.error('Token refresh error:', refreshError);
              setError('Authentication error. Please login again.');
            }
          } else {
            // Handle other status codes
            const errorText = await response.text();
            console.error(`Error ${response.status}:`, errorText);
            setError(`Failed to load profile data (${response.status})`);
          }
        } else {
          console.log('Profile fetch successful');
          const userData = await response.json();
          console.log('User data received:', userData);
          setUser(userData);
          setName(userData.name || '');
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile data');
      } finally {
        setIsPageLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [setUser]);

  const handleEmailChange = async () => {
    if (emailData.newEmail !== emailData.confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (!emailData.newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!emailData.currentPassword) {
      setError('Current password is required to change your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.changeEmail(emailData.newEmail, emailData.currentPassword);
      setSuccessMessage(`Verification email sent to ${emailData.newEmail}. Please check your email and click the verification link to complete the email change.`);
      setEmailData({ newEmail: '', confirmEmail: '', currentPassword: '' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to change email');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!passwordData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccessMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSettingsClose = () => {
    setEmailData({ newEmail: '', confirmEmail: '', currentPassword: '' });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    setSuccessMessage(null);
    setIsAccountSettingsOpen(false);
  };

  const handleDeleteProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting profile deletion...');
      
      // Check if we have tokens
      const tokensStr = localStorage.getItem('tokens');
      if (!tokensStr) {
        throw new Error('No authentication tokens found. Please log in again.');
      }
      
      const tokens = JSON.parse(tokensStr);
      if (!tokens.access) {
        throw new Error('No access token found. Please log in again.');
      }
      
      console.log('Using access token for deletion:', tokens.access.substring(0, 20) + '...');
      
      await userApi.deleteProfile();
      
      console.log('Profile deletion successful');
      
      // Clear all user data from localStorage
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_role');
      
      // Reset auth context
      setUser(null);
      
      // Show success message and redirect to home
      setSuccessMessage('Your profile has been successfully deleted.');
      setIsDeleteDialogOpen(false);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err: any) {
      console.error('Profile deletion error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'Failed to delete profile';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication expired. Please log in again and try deleting your profile.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this profile.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Profile not found.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    
    try {
      const updatedUser = await userApi.updateProfile({ name: editedName.trim() });
      setName(editedName.trim());
      setIsEditingName(false);
      
      // Update user context with the new name
      if (user && setUser) {
        setUser({
          ...user,
          name: editedName.trim()
        });
      }
      
      console.log('Name updated successfully:', updatedUser);
    } catch (error) {
      console.error('Error updating name:', error);
      // Show error message to user
      alert('Failed to update name. Please try again.');
    }
  };

  const handleCancelNameEdit = () => {
    setEditedName(user?.name || '');
    setIsEditingName(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      
      const updatedUser = await userApi.uploadProfileImage(file);
      
      // Update user context with new profile image
      setUser(updatedUser);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccessMessage('Profile image uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError('Failed to upload profile image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getProfileImageUrl = () => {
    if (!user?.profile_image) return '';
    if (user.profile_image.startsWith('http')) return user.profile_image;
    
    const baseUrl = API_URL.replace('/api/', '').replace('/api', '');
    return `${baseUrl}${user.profile_image}`;
  };

  // Calculate user statistics
  const calculateUserStats = () => {
    // Calculate member since date
    let memberSince = 'Dec 2024'; // Default fallback
    
    console.log('Debug - Full user object:', user);
    console.log('Debug - user.date_joined value:', user?.date_joined);
    console.log('Debug - typeof user.date_joined:', typeof user?.date_joined);
    
    // Check localStorage directly
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log('Debug - User from localStorage:', parsedUser);
      console.log('Debug - date_joined from localStorage:', parsedUser.date_joined);
    }
    
    if (user?.date_joined) {
      try {
        console.log('Debug - Attempting to parse date:', user.date_joined);
        const joinDate = new Date(user.date_joined);
        console.log('Debug - Parsed join date:', joinDate);
        memberSince = joinDate.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        console.log('Debug - Formatted member since:', memberSince);
      } catch (error) {
        console.error('Error parsing join date:', error);
      }
    } else {
      console.log('Debug - No date_joined field found in user object');
    }

    // Use consultation data from API response if available
    if (user?.consultations) {
      console.log('Debug - Using consultation data from API:', user.consultations);
      return {
        memberSince,
        expertsConsulted: user.consultations.experts_consulted,
        totalConsultations: user.consultations.total_consultations,
        mostUsedIndustry: user.consultations.most_used_industry
      };
    }

    // Fallback to empty consultation data
    console.log('Debug - No consultation data available, using fallback values');
    return {
      memberSince,
      expertsConsulted: 0,
      totalConsultations: 0,
      mostUsedIndustry: '-'
    };
  };



  // Determine role text
  const userRole = isExpert ? 'Expert' : isUser ? 'User' : 'Guest';

  // Show loading indicator while page is loading
  if (isPageLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Show error message if there was an error loading the page
  if (error && !user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Typography variant="body1" align="center">
          Please try <Button href="/login" color="primary">logging in</Button> again.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 2, maxWidth: 1000, mx: 'auto' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h4" color="primary">
              My Profile
            </Typography>
                            <Tooltip title="How Duplix AI Works">
              <IconButton
                onClick={() => setIsHowItWorksOpen(true)}
                sx={{ ml: 1 }}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Account Settings">
              <IconButton
                onClick={() => setIsAccountSettingsOpen(true)}
                sx={{ ml: 1 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
                  {/* Profile Section with Statistics */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 4,
            mt: 2,
            mb: 4
          }}>
            {/* Left Side - Profile Picture and Name */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              minWidth: 200
            }}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar 
                  src={getProfileImageUrl()}
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    fontSize: '3rem',
                    bgcolor: 'primary.main'
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                
                {/* Profile Image Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    width: 36,
                    height: 36,
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '&:disabled': {
                      bgcolor: 'grey.400',
                    }
                  }}
                >
                  {uploading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <CameraAltIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>
              
              {isEditingName ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <TextField
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ minWidth: 200 }}
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName();
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={handleSaveName} variant="contained">
                      Save
                    </Button>
                    <Button size="small" onClick={handleCancelNameEdit} variant="outlined">
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {user?.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditedName(user?.name || '');
                      setIsEditingName(true);
                    }}
                    sx={{ mb: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Right Side - User Statistics */}
            <Box sx={{ flex: 1, maxWidth: 400 }}>
              {(() => {
                const stats = calculateUserStats();
                return (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #e0e0e0' }}>
                      <Typography variant="body1" color="text.secondary">
                        Member Since
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {stats.memberSince}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #e0e0e0' }}>
                      <Typography variant="body1" color="text.secondary">
                        Experts Consulted
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {stats.expertsConsulted}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #e0e0e0' }}>
                      <Typography variant="body1" color="text.secondary">
                        Total Consultations
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {stats.totalConsultations}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                      <Typography variant="body1" color="text.secondary">
                        Most Consulted Industry
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {stats.mostUsedIndustry}
                      </Typography>
                    </Box>
                  </>
                );
              })()}
            </Box>
          </Box>

        {/* Consultation History Section */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Your Consultation History
          </Typography>
          
          {(!user?.consultations?.sessions || user.consultations.sessions.length === 0) ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No consultations yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start exploring our experts to begin your first AI consultation. 
                Each conversation will appear here for easy access to your consultation history.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/experts')}
                sx={{ 
                  py: 1.5,
                  px: 3,
                  borderRadius: 2
                }}
              >
                Browse Experts Now
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {user.consultations.sessions.map((consultation) => (
                <Grid item xs={12} key={consultation.id}>
                  <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {consultation.expert_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {consultation.expert_industry} • {new Date(consultation.started_at).toLocaleDateString()} • {consultation.total_messages} messages
                        </Typography>
                        <Typography variant="body1">
                          Consultation with {consultation.expert_name} about {consultation.expert_specialty}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/experts/${consultation.expert_id}`)}
                      >
                        Chat with {consultation.expert_name.split(' ')[0]}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Account Settings Dialog */}
        <Dialog
          open={isAccountSettingsOpen}
          onClose={handleAccountSettingsClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Account Settings</Typography>
            <IconButton onClick={handleAccountSettingsClose} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
                {successMessage}
              </Alert>
            )}

            {/* Current Email Display */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Current Email
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {user?.email || 'Not provided'}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Change Email Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Change Email Address
              </Typography>
              
              <TextField
                fullWidth
                label="New Email Address"
                type="email"
                value={emailData.newEmail}
                onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                margin="normal"
                disabled={isLoading}
              />
              
              <TextField
                fullWidth
                label="Confirm New Email"
                type="email"
                value={emailData.confirmEmail}
                onChange={(e) => setEmailData({ ...emailData, confirmEmail: e.target.value })}
                margin="normal"
                disabled={isLoading}
              />

              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={emailData.currentPassword}
                onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })}
                margin="normal"
                disabled={isLoading}
                helperText="Password is required for security when changing your email address"
              />

              <Button
                variant="outlined"
                onClick={handleEmailChange}
                disabled={isLoading || !emailData.newEmail || !emailData.confirmEmail || !emailData.currentPassword}
                sx={{ mt: 1 }}
              >
                Update Email
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Change Password Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>

              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                margin="normal"
                disabled={isLoading}
              />

              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                margin="normal"
                disabled={isLoading}
                helperText="Password must be at least 8 characters long"
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                margin="normal"
                disabled={isLoading}
              />

              <Button
                variant="outlined"
                onClick={handlePasswordChange}
                disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                sx={{ mt: 1 }}
              >
                Update Password
              </Button>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button 
              onClick={() => setIsDeleteDialogOpen(true)}
              color="error"
              sx={{ mr: 'auto' }}
            >
              Delete Profile
            </Button>
            <Button onClick={handleAccountSettingsClose} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>

                  {/* How Duplix AI Works Dialog */}
        <Dialog 
          open={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              How Duplix AI Works
            </Typography>
            <IconButton onClick={() => setIsHowItWorksOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    bgcolor: 'primary.main', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}>
                    <Typography variant="h4" sx={{ color: 'white' }}>1</Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    Browse Experts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explore our curated list of AI-trained experts across various industries and specialties.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    bgcolor: 'primary.main', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}>
                    <Typography variant="h4" sx={{ color: 'white' }}>2</Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    Chat with AI
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start a conversation with an expert's AI trained on their knowledge and experience.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    bgcolor: 'primary.main', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}>
                    <Typography variant="h4" sx={{ color: 'white' }}>3</Typography>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    Get Expert Advice
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receive personalized advice and insights based on real expert knowledge and methodology.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={isDeleteDialogOpen} 
          onClose={() => setIsDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            Delete Profile
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to delete your profile? This action is permanent and cannot be undone.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All your account data will be permanently deleted, including:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Your profile information
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Your account history
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                All associated data
              </Typography>
            </Box>
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained"
              color="error"
              onClick={handleDeleteProfile}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete My Profile'}
            </Button>
          </DialogActions>
        </Dialog>

        {successMessage && (
          <Snackbar
            open={!!successMessage}
            autoHideDuration={6000}
            onClose={() => setSuccessMessage(null)}
          >
            <Alert onClose={() => setSuccessMessage(null)} severity="success">
              {successMessage}
            </Alert>
          </Snackbar>
        )}
      </Paper>
    </Container>
  );
};

export default UserProfilePage; 