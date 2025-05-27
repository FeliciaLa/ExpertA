import React, { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { API_URL } from '../services/api';

const UserProfilePage: React.FC = () => {
  const { user, setUser, isUser, isExpert } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

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
              const directResponse = await fetch(`${API_URL}/api/user/profile/direct/${parsedUserData.id}/?nocache=${Date.now()}`, {
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
                setUser(userData);
                setName(userData.name || '');
                setEmail(userData.email || '');
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
        const response = await fetch(`${API_URL}/api/user/profile/?nocache=${nocache}`, {
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
              console.log('Attempting to refresh token with endpoint:', `${API_URL}/api/user/token/refresh/`);
              const refreshResponse = await fetch(`${API_URL}/api/user/token/refresh/`, {
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
                
                const retryResponse = await fetch(`${API_URL}/api/user/profile/?nocache=${newNocache}`, {
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
                  setEmail(userData.email || '');
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
                    const directResponse = await fetch(`${API_URL}/api/user/profile/direct/${parsedUserData.id}/?nocache=${Date.now()}`, {
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
                      setEmail(userData.email || '');
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
          setEmail(userData.email || '');
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

  const handleEditProfile = async () => {
    // Form validation
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only include fields that have values
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (currentPassword) updateData.currentPassword = currentPassword;
      if (newPassword) updateData.newPassword = newPassword;
      
      // Add user_id for direct access approach
      const storedUserData = localStorage.getItem('user');
      if (!storedUserData) {
        throw new Error('User data not found in local storage');
      }
      
      const parsedUserData = JSON.parse(storedUserData);
      if (!parsedUserData.id) {
        throw new Error('User ID not found in stored user data');
      }
      
      // Add user_id to request for direct access authentication
      updateData.user_id = parsedUserData.id;
      
      console.log('Updating user profile with data:', { 
        ...updateData, 
        currentPassword: updateData.currentPassword ? '****' : undefined,
        newPassword: updateData.newPassword ? '****' : undefined,
        user_id: updateData.user_id
      });
      
      // Make a direct fetch request without token authentication
      const response = await fetch(`${API_URL}/api/user/profile/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(updateData),
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit'
      });
      
      console.log('Profile update response status:', response.status);
      
      if (!response.ok) {
        // Try to parse error message from the response
        try {
          const errorData = await response.json();
          console.error('Profile update error response:', errorData);
          throw new Error(errorData.error || `Failed with status ${response.status}`);
        } catch (jsonError) {
          // If can't parse JSON, use status text
          throw new Error(`Failed with status ${response.status}: ${response.statusText}`);
        }
      }
      
      // If we get here, the update was successful
      console.log('Profile update successful');
      
      // Get the updated user data
      const userData = await response.json();
      setUser(userData);
      
      // Update user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Close dialog
      setIsEditDialogOpen(false);
      
      // Show success message
      setSuccessMessage('Profile updated successfully');
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update profile';
      setError(errorMessage);
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
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
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        My Profile
      </Typography>

      <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Basic Information
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'primary.main',
                fontSize: '3rem'
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
          </Grid>

          <Grid item xs={12} sm={8}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="h6">
                {user?.name || 'Not provided'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="h6">
                {user?.email || 'Not provided'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Role
              </Typography>
              <Typography variant="h6">
                {userRole}
              </Typography>
            </Box>

            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setIsEditDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit Profile
          <IconButton
            aria-label="close"
            onClick={() => setIsEditDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'text.secondary'
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
            />
            
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Change Password
            </Typography>
            
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditProfile}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Save Changes'}
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
    </Container>
  );
};

export default UserProfilePage; 