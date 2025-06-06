import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import { expertApi, API_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  name: string;
  email: string;
  bio: string;
  specialties: string;
  title: string;
  profile_image?: string;
  profile?: {
    industry: string;
    years_of_experience: number;
    key_skills: string;
    typical_problems: string;
    background: string;
    certifications: string;
    methodologies: string;
    tools_technologies: string;
  };
}

const ExpertProfile: React.FC = () => {
  const { expert, setUser, setIsAuthenticated, setIsExpert, setIsUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: expert?.name || '',
    email: expert?.email || '',
    bio: expert?.bio || '',
    specialties: expert?.specialties || '',
    title: expert?.title || 'Expert',
    profile_image: expert?.profile_image || '',
    profile: expert?.profile || {
      industry: '',
      years_of_experience: 0,
      key_skills: '',
      typical_problems: '',
      background: '',
      certifications: '',
      methodologies: '',
      tools_technologies: '',
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Check if we have authentication tokens
      const tokens = localStorage.getItem('tokens');
      if (!tokens) {
        setError('Authentication required. Please log out and log in again.');
        return;
      }

      try {
        const parsedTokens = JSON.parse(tokens);
        if (!parsedTokens.access) {
          setError('Invalid authentication. Please log out and log in again.');
          return;
        }
      } catch (e) {
        setError('Corrupted authentication data. Please log out and log in again.');
        return;
      }

      const data = await expertApi.getProfile();
      setProfile({
        ...data,
        title: data.title || 'Expert',
        bio: data.bio || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Authentication expired or invalid. Please log out and log in again to refresh your session.');
      } else {
        setError('Failed to fetch profile');
      }
    }
  };

  const handleSave = async () => {
    try {
      const data = await expertApi.updateProfile({
        name: profile.name,
        bio: profile.bio,
        specialties: profile.specialties,
        title: profile.title,
      });
      
      setProfile({
        ...profile,
        ...data,
      });
      setIsEditing(false);
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile');
    }
  };

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = await expertApi.uploadProfileImage(file);
      setProfile({
        ...profile,
        profile_image: data.profile_image,
      });
      setSuccess('Profile image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      setError('Failed to upload profile image');
    } finally {
      setUploading(false);
    }
  };

  const getProfileImageUrl = () => {
    if (!profile.profile_image) return '';
    
    // Handle both relative and absolute URLs
    if (profile.profile_image.startsWith('http')) {
      return profile.profile_image;
    }
    
    // Use the configured API URL base
    const baseUrl = API_URL.replace('/api/', '').replace('/api', '');
    return `${baseUrl}${profile.profile_image}`;
  };

  const handleDeleteProfile = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await expertApi.deleteProfile();
      
      // Clear all local storage
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_role');
      
      // Reset auth context
      setUser(null);
      setIsAuthenticated(false);
      setIsExpert(false);
      setIsUser(false);
      
      // Redirect to home page
      navigate('/');
      
    } catch (error: any) {
      console.error('Delete profile error:', error);
      setError(error.response?.data?.error || 'Failed to delete profile');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleClearAuthentication = () => {
    // Clear all authentication data
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_role');
    
    // Reset auth context
    setUser(null);
    setIsAuthenticated(false);
    setIsExpert(false);
    setIsUser(false);
    
    // Redirect to home page to re-login
    navigate('/');
  };

  return (
    <Paper sx={{ p: 3, mb: 4, backgroundColor: 'white' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h6" color="primary">
          My Profile
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            color="primary"
          >
            {isEditing ? <SaveIcon /> : <EditIcon />}
          </IconButton>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleOpenDeleteDialog}
            sx={{ ml: 1 }}
          >
            Delete Profile
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center">
          <Avatar
            src={getProfileImageUrl()}
            sx={{ 
              width: 150, 
              height: 150, 
              fontSize: '3rem', 
              mb: 2,
              bgcolor: 'primary.main' 
            }}
          >
            {profile.name ? profile.name[0] : ''}
          </Avatar>
          
          {isEditing && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mb: 2 }}
                onClick={handleImageUpload}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={24} /> : 'Upload Photo'}
              </Button>
            </>
          )}
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Personal Information
          </Typography>
          
          <TextField
            label="Professional Title"
            value={profile.title}
            onChange={(e) => setProfile({ ...profile, title: e.target.value })}
            disabled={!isEditing}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="e.g., Data Scientist, Marketing Expert, etc."
          />
          
          <TextField
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            disabled={!isEditing}
            fullWidth
            variant="outlined"
            size="small"
          />
          
          <TextField
            label="Email"
            value={profile.email}
            disabled
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Bio"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            disabled={!isEditing}
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Write a compelling bio that describes your expertise, experience, and what makes you unique as an expert. This will be visible to users searching for experts."
            helperText={isEditing ? "Please write your own professional bio. This is what users will see when they view your profile." : ""}
          />
        </Grid>
      </Grid>

      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error">
            {error}
            {(error.includes('Authentication') || error.includes('log out and log in')) && (
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleClearAuthentication}
                  sx={{ mt: 1 }}
                >
                  Clear Authentication & Re-login
                </Button>
              </Box>
            )}
          </Alert>
        </Snackbar>
      )}

      {success && (
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
          <Alert onClose={() => setSuccess(null)} severity="success">
            {success}
          </Alert>
        </Snackbar>
      )}

      {/* Delete Profile Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to permanently delete your expert profile? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ ml: 2, mt: 1 }}>
            • Delete all your profile information<br/>
            • Remove your expert account permanently<br/>
            • Sign you out of the application<br/>
            • Allow you to register again with the same email if needed
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProfile} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Delete Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ExpertProfile; 