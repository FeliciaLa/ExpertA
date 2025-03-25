import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  specialties: string;
}

const ExpertProfile: React.FC = () => {
  const { expert } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: expert?.first_name || '',
    last_name: expert?.last_name || '',
    email: expert?.email || '',
    bio: expert?.bio || '',
    specialties: expert?.specialties || '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/expert/profile/');
      setProfile({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        specialties: response.data.specialties || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleSave = async () => {
    try {
      const response = await api.put('/api/expert/profile/update/', {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        specialties: profile.specialties || '',
      });
      setProfile({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        specialties: response.data.specialties || '',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4, backgroundColor: 'white' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h6" color="primary">
          Expert Profile
        </Typography>
        <IconButton 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          color="primary"
        >
          {isEditing ? <SaveIcon /> : <EditIcon />}
        </IconButton>
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" gap={2}>
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
        />

        <TextField
          label="Specialties"
          value={profile.specialties}
          onChange={(e) => setProfile({ ...profile, specialties: e.target.value })}
          disabled={!isEditing}
          fullWidth
          variant="outlined"
          size="small"
          placeholder="e.g., Machine Learning, Natural Language Processing, Computer Vision"
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
          placeholder="Tell us about your expertise and experience..."
        />
      </Box>
    </Paper>
  );
};

export default ExpertProfile; 