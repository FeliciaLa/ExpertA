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
  MenuItem,
  Chip,
  Divider
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

const INDUSTRIES = [
  'Technology & Software',
  'Marketing & Advertising', 
  'Finance & Banking',
  'Healthcare & Medicine',
  'Education & Training',
  'Consulting & Strategy',
  'Design & Creative',
  'Sales & Business Development',
  'Operations & Management',
  'Legal & Compliance',
  'Real Estate',
  'Manufacturing',
  'Retail & E-commerce',
  'Other'
];

const EXPERIENCE_LEVELS = [
  '1-2 years',
  '3-5 years', 
  '6-10 years',
  '11-15 years',
  '16-20 years',
  '20+ years'
];

const ExpertProfile: React.FC = () => {
  const { expert, setUser, setIsAuthenticated, setIsExpert, setIsUser, refreshExpert } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skillInput, setSkillInput] = useState('');
  const [keySkills, setKeySkills] = useState<string[]>([]);
  
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

  useEffect(() => {
    if (profile?.profile?.key_skills) {
      setKeySkills(profile.profile.key_skills.split(', ').filter(skill => skill.trim()));
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      console.log('=== FETCH PROFILE START ===');
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
      console.log('API Profile data received:', data);
      console.log('Bio from API:', data.bio);
      console.log('Profile from API:', data.profile);
      
      const updatedProfile = {
        ...data,
        title: data.title || 'Expert',
        bio: data.bio || '',
        profile: data.profile || {
          industry: '',
          years_of_experience: 0,
          key_skills: '',
          typical_problems: '',
          background: '',
          certifications: '',
          methodologies: '',
          tools_technologies: '',
        }
      };
      
      console.log('Setting profile state to:', updatedProfile);
      setProfile(updatedProfile);
      console.log('=== FETCH PROFILE END ===');
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Authentication expired or invalid. Please log out and log in again to refresh your session.');
      } else {
        setError('Failed to fetch profile');
      }
    }
  };

  const getExperienceDisplayValue = (yearsOfExperience: number | undefined) => {
    if (!yearsOfExperience) return '1-2 years';
    
    if (yearsOfExperience <= 2) return '1-2 years';
    if (yearsOfExperience <= 5) return '3-5 years';
    if (yearsOfExperience <= 10) return '6-10 years';
    if (yearsOfExperience <= 15) return '11-15 years';
    if (yearsOfExperience <= 20) return '16-20 years';
    return '20+ years';
  };

  const handleSave = async () => {
    console.log('🔥 SAVE BUTTON CLICKED - Function started!');
    alert('Save function called!'); // Temporary alert to ensure function is running
    try {
      console.log('=== SAVE DEBUG START ===');
      console.log('Current profile state:', profile);
      console.log('Current keySkills:', keySkills);
      
      // Prepare the update data
      const updateData = {
        name: profile.name,
        bio: profile.bio,
        specialties: `${keySkills.join(', ')}\n\nMethodologies: ${profile.profile?.methodologies || ''}\nTools: ${profile.profile?.tools_technologies || ''}`,
        title: profile.title,
        profile: {
          industry: profile.profile?.industry || '',
          years_of_experience: profile.profile?.years_of_experience || 0,
          key_skills: keySkills.join(', '),
          typical_problems: profile.profile?.typical_problems || '',
          background: profile.profile?.background || '',
          certifications: profile.profile?.certifications || '',
          methodologies: profile.profile?.methodologies || '',
          tools_technologies: profile.profile?.tools_technologies || ''
        }
      };

      console.log('Update data being sent:', updateData);
      
      const data = await expertApi.updateProfile(updateData);
      console.log('API response received:', data);
      
      // Check if profile is sufficiently complete to mark onboarding as done
      const isProfileComplete = 
        profile.name.trim() &&
        profile.title.trim() &&
        profile.bio.trim() &&
        profile.profile?.industry &&
        profile.profile?.years_of_experience &&
        keySkills.length > 0;

      console.log('Profile completeness check:', {
        name: profile.name.trim(),
        title: profile.title.trim(), 
        bio: profile.bio.trim(),
        industry: profile.profile?.industry,
        years_of_experience: profile.profile?.years_of_experience,
        keySkillsLength: keySkills.length,
        isComplete: isProfileComplete
      });

      // If profile is complete and onboarding isn't marked as complete, complete it
      if (isProfileComplete && !expert?.onboarding_completed) {
        try {
          console.log('Completing onboarding...');
          await expertApi.completeOnboarding({
            industry: profile.profile?.industry || '',
            years_of_experience: profile.profile?.years_of_experience || 0,
            key_skills: keySkills.join(', '),
            typical_problems: profile.profile?.typical_problems || `As a ${profile.title}, I help clients solve complex challenges in my field.`,
            background: profile.profile?.background || '',
            certifications: profile.profile?.certifications || '',
            methodologies: profile.profile?.methodologies || '',
            tools_technologies: profile.profile?.tools_technologies || ''
          });
          // Refresh expert data to update onboarding status
          await refreshExpert();
          setSuccess('Profile updated and onboarding completed! You can now start training your AI.');
        } catch (onboardingError) {
          console.error('Failed to complete onboarding:', onboardingError);
          setSuccess('Profile updated successfully');
        }
      } else {
        setSuccess('Profile updated successfully');
      }
      
      // Refresh the profile data from the server to ensure we have the latest data
      console.log('Refreshing profile from server...');
      await fetchProfile();
      console.log('=== SAVE DEBUG END ===');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      console.error('Error details:', error.response?.data);
      setError('Failed to update profile');
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !keySkills.includes(skillInput.trim())) {
      const newSkills = [...keySkills, skillInput.trim()];
      setKeySkills(newSkills);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = keySkills.filter(skill => skill !== skillToRemove);
    setKeySkills(newSkills);
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
    <Paper sx={{ p: 4, mb: 4, backgroundColor: 'white' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" color="primary">
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

      <Grid container spacing={4}>
        {/* Profile Image Section */}
        <Grid item xs={12} md={3} display="flex" flexDirection="column" alignItems="center">
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
        
        {/* Profile Information Section */}
        <Grid item xs={12} md={9}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Professional Title"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                placeholder="e.g., Senior Marketing Manager, Data Scientist"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Email"
                value={profile.email}
                disabled
                fullWidth
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Professional Bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                disabled={!isEditing}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="A concise professional bio that will be shown to users (2-3 sentences about your expertise and approach)..."
                helperText="This is your public-facing bio that users will see when browsing experts"
              />
            </Grid>

            {/* Experience & Expertise */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Experience & Expertise
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Industry"
                value={profile.profile?.industry || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, industry: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                select={isEditing}
              >
                {isEditing && INDUSTRIES.map((industry) => (
                  <MenuItem key={industry} value={industry}>
                    {industry}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Years of Experience"
                value={getExperienceDisplayValue(profile.profile?.years_of_experience)}
                onChange={(e) => {
                  const experienceMap: { [key: string]: number } = {
                    '1-2 years': 2,
                    '3-5 years': 5,
                    '6-10 years': 10,
                    '11-15 years': 15,
                    '16-20 years': 20,
                    '20+ years': 25
                  };
                  const numericValue = experienceMap[e.target.value] || 2;
                  setProfile({ 
                    ...profile, 
                    profile: { ...profile.profile!, years_of_experience: numericValue }
                  });
                }}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                select={isEditing}
              >
                {isEditing && EXPERIENCE_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Key Skills */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Key Skills
              </Typography>
              {isEditing && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Add a skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="e.g., Project Management, Python, SEO"
                    variant="outlined"
                    size="small"
                  />
                  <Button onClick={handleAddSkill} variant="outlined">
                    Add
                  </Button>
                </Box>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {keySkills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={isEditing ? () => handleRemoveSkill(skill) : undefined}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>

            {/* Additional Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Additional Details
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Methodologies & Frameworks"
                value={profile.profile?.methodologies || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, methodologies: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                placeholder="e.g., Agile, Design Thinking, LEAN"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Tools & Technologies"
                value={profile.profile?.tools_technologies || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, tools_technologies: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                placeholder="e.g., Salesforce, Adobe Creative Suite, Python"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Background & Experience"
                value={profile.profile?.background || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, background: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Detailed description of your professional background, education, career journey, and specific experiences that shaped your expertise..."
                helperText="Provide comprehensive details about your professional journey and qualifications"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Certifications"
                value={profile.profile?.certifications || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, certifications: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                variant="outlined"
                placeholder="List your relevant certifications..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Typical Problems You Solve"
                value={profile.profile?.typical_problems || ''}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  profile: { ...profile.profile!, typical_problems: e.target.value }
                })}
                disabled={!isEditing}
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                placeholder="Describe the types of problems you typically help clients solve..."
              />
            </Grid>
          </Grid>
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