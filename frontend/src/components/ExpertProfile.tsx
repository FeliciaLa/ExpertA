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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import { expertApi } from '../services/api';
import { API_URL } from '../config';

interface ProfileData {
  first_name: string;
  last_name: string;
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
  const { expert } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: expert?.first_name || '',
    last_name: expert?.last_name || '',
    email: expert?.email || '',
    bio: '',
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
      const data = await expertApi.getProfile();
      setProfile({
        ...data,
        title: data.title || 'Expert',
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to fetch profile');
    }
  };

  const handleSave = async () => {
    try {
      const data = await expertApi.updateProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
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

  return (
    <Paper sx={{ p: 3, mb: 4, backgroundColor: 'white' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h6" color="primary">
          My Profile
        </Typography>
        <Box display="flex" alignItems="center">
          <IconButton 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            color="primary"
          >
            {isEditing ? <SaveIcon /> : <EditIcon />}
          </IconButton>
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
            {profile.first_name ? profile.first_name[0] : ''}
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
          
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="First Name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              disabled={!isEditing}
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="Last Name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              disabled={!isEditing}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>
          
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
    </Paper>
  );
};

export default ExpertProfile; 