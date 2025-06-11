import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';

import { useAuth } from '../contexts/AuthContext';
import { expertApi, API_URL } from '../services/api';
import { AccountSettingsModal } from './AccountSettingsModal';

// Industry options
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

// Experience levels
const EXPERIENCE_LEVELS = [
  '1-2 years',
  '3-5 years', 
  '6-10 years',
  '11-15 years',
  '16-20 years',
  '20+ years'
];

interface ExpertProfileData {
  // Basic information
  name: string;
  title: string;
  email: string;
  bio: string;
  profile_image?: string;
  
  // Professional details
  industry: string[];
  expertise: string;
  years_of_experience: number;
  key_skills: string[];
  background: string;
  typical_problems: string;
  methodologies: string;
  tools_technologies: string;
  certifications: string;
}

const ExpertProfile: React.FC = () => {
  const { expert, refreshExpert } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  console.log('ExpertProfile component mounted/rendered', { expert: expert?.email, onboarding: expert?.onboarding_completed });
  
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  
  const [profileData, setProfileData] = useState<ExpertProfileData>({
    name: '',
    title: '',
    email: '',
    bio: '',
    profile_image: '',
    industry: [],
    expertise: '',
    years_of_experience: 0,
    key_skills: [],
    background: '',
    typical_problems: '',
    methodologies: '',
    tools_technologies: '',
    certifications: ''
  });

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh expert data separately to ensure we have the latest onboarding status
  useEffect(() => {
    if (refreshExpert) {
      refreshExpert();
    }
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await expertApi.getProfile();
      console.log('Loaded profile data:', data);
      
      // Convert API response to our local format
      const skills = data.profile?.key_skills ? 
        data.profile.key_skills.split(', ').filter((s: string) => s.trim()) : [];
      
      setProfileData({
        name: data.name || '',
        title: data.title || '',
        email: data.email || '',
        bio: data.bio || '',
        profile_image: data.profile_image || '',
        industry: data.profile?.industry ? data.profile.industry.split(', ').filter((s: string) => s.trim()) : [],
        expertise: data.specialties || '',
        years_of_experience: data.profile?.years_of_experience || 0,
        key_skills: skills,
        background: data.profile?.background || '',
        typical_problems: data.profile?.typical_problems || '',
        methodologies: data.profile?.methodologies || '',
        tools_technologies: data.profile?.tools_technologies || '',
        certifications: data.profile?.certifications || ''
      });
      
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Prepare data for API
      const updateData = {
        name: profileData.name,
        title: profileData.title,
        bio: profileData.bio,
        specialties: profileData.expertise,
        profile: {
          industry: profileData.industry.join(', '),
          years_of_experience: profileData.years_of_experience,
          key_skills: profileData.key_skills.join(', '),
          background: profileData.background,
          typical_problems: profileData.typical_problems,
          methodologies: profileData.methodologies,
          tools_technologies: profileData.tools_technologies,
          certifications: profileData.certifications
        }
      };
      
      console.log('=== FRONTEND SAVE DEBUG START ===');
      console.log('Saving profile data:', updateData);
      
      const response = await expertApi.updateProfile(updateData);
      console.log('Save response:', response);
      
      // Check if profile is complete for onboarding
      const isComplete = profileData.name && profileData.title && profileData.bio && 
                        profileData.industry.length > 0 && profileData.years_of_experience > 0 && 
                        profileData.key_skills.length > 0;
      
      console.log('=== PROFILE COMPLETENESS CHECK ===');
      console.log('name:', profileData.name, '✓');
      console.log('title:', profileData.title, profileData.title ? '✓' : '❌');
      console.log('bio:', profileData.bio, profileData.bio ? '✓' : '❌');
      console.log('industry:', profileData.industry, profileData.industry.length > 0 ? '✓' : '❌');
      console.log('years_of_experience:', profileData.years_of_experience, profileData.years_of_experience > 0 ? '✓' : '❌');
      console.log('key_skills:', profileData.key_skills, profileData.key_skills.length > 0 ? '✓' : '❌');
      console.log('isComplete:', isComplete);
      console.log('expert.onboarding_completed:', expert?.onboarding_completed);
      
      if (isComplete && !expert?.onboarding_completed) {
        console.log('Profile is complete, attempting onboarding completion...');
        try {
          const onboardingData = {
            industry: profileData.industry.join(', '),
            years_of_experience: profileData.years_of_experience,
            key_skills: profileData.key_skills.join(', '),
            typical_problems: profileData.typical_problems || `As a ${profileData.title}, I help clients solve complex challenges in my field.`,
            background: profileData.background,
            certifications: profileData.certifications,
            methodologies: profileData.methodologies,
            tools_technologies: profileData.tools_technologies
          };
          console.log('Onboarding data:', onboardingData);
          
          const onboardingResponse = await expertApi.completeOnboarding(onboardingData);
          console.log('Onboarding response:', onboardingResponse);
          
          await refreshExpert();
          setSuccess('Profile saved and onboarding completed! You can now train your AI.');
        } catch (onboardingError) {
          console.error('Onboarding completion failed:', onboardingError);
          setSuccess('Profile saved successfully!');
        }
      } else {
        console.log('Profile not complete or onboarding already done:', { isComplete, onboardingCompleted: expert?.onboarding_completed });
        setSuccess('Profile saved successfully!');
      }
      
      console.log('=== FRONTEND SAVE DEBUG END ===');
      
      setIsEditing(false);
      
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await expertApi.uploadProfileImage(file);
      
      setProfileData(prev => ({
        ...prev,
        profile_image: response.profile_image
      }));
      
      setSuccess('Profile image uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError('Failed to upload profile image');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileData.key_skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        key_skills: [...prev.key_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      key_skills: prev.key_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addIndustry = () => {
    if (newIndustry.trim() && !profileData.industry.includes(newIndustry.trim())) {
      setProfileData(prev => ({
        ...prev,
        industry: [...prev.industry, newIndustry.trim()]
      }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (industryToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      industry: prev.industry.filter(industry => industry !== industryToRemove)
    }));
  };

  const getExperienceDisplay = (years: number) => {
    if (years <= 2) return '1-2 years';
    if (years <= 5) return '3-5 years';
    if (years <= 10) return '6-10 years';
    if (years <= 15) return '11-15 years';
    if (years <= 20) return '16-20 years';
    return '20+ years';
  };

  const getProfileImageUrl = () => {
    if (!profileData.profile_image) return '';
    if (profileData.profile_image.startsWith('http')) return profileData.profile_image;
    
    const baseUrl = API_URL.replace('/api/', '').replace('/api', '');
    return `${baseUrl}${profileData.profile_image}`;
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      setError(null);
      
      // Call API to delete profile (you'll need to implement this endpoint)
      await expertApi.deleteProfile();
      
      // Clear local storage
      localStorage.clear();
      
      // Redirect to home page or login
      window.location.href = '/';
      
    } catch (err: any) {
      console.error('Failed to delete profile:', err);
      setError('Failed to delete profile. Please try again.');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h4" color="primary">
            My Profile
          </Typography>
          <Tooltip title="Account Settings">
            <IconButton
              onClick={() => setShowAccountSettings(true)}
              sx={{ ml: 1 }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box>
          {isEditing ? (
            <>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ mr: 1 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={() => {
                  setIsEditing(false);
                  loadProfile(); // Reset to original data
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Profile Image */}
        <Grid item xs={12} md={3}>
          <Box display="flex" flexDirection="column" alignItems="center">
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
              {profileData.name ? profileData.name[0].toUpperCase() : 'E'}
            </Avatar>
            
            {isEditing && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="small"
                >
                  {uploading ? <CircularProgress size={20} /> : 'Upload Photo'}
                </Button>
              </>
            )}
          </Box>
        </Grid>

        {/* Profile Form */}
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
                fullWidth
                label="Full Name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!isEditing}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Professional Title"
                value={profileData.title}
                onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g., Senior Marketing Manager, Data Scientist"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Professional Bio"
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!isEditing}
                multiline
                rows={3}
                placeholder="A brief professional bio that users will see when browsing experts..."
                helperText="This bio will be displayed publicly to potential clients"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expertise"
                value={profileData.expertise}
                onChange={(e) => setProfileData(prev => ({ ...prev, expertise: e.target.value }))}
                disabled={!isEditing}
                multiline
                rows={4}
                placeholder="e.g., I specialize in digital marketing strategy for SaaS companies, with deep expertise in conversion optimization and growth hacking..."
                helperText="Describe your core area of expertise and what you specialize in"
              />
            </Grid>

            {/* Experience & Expertise */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Experience & Expertise
              </Typography>
            </Grid>

            {/* Industry */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Industry
              </Typography>
              
              {isEditing && (
                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Add an industry"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIndustry()}
                    placeholder="e.g., Technology, Marketing, Healthcare"
                  />
                  <Button variant="outlined" onClick={addIndustry}>
                    Add
                  </Button>
                </Box>
              )}
              
              <Box display="flex" flexWrap="wrap" gap={1}>
                {profileData.industry.map((industry) => (
                  <Chip
                    key={industry}
                    label={industry}
                    onDelete={isEditing ? () => removeIndustry(industry) : undefined}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {profileData.industry.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No industries added yet
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Years of Experience"
                value={getExperienceDisplay(profileData.years_of_experience)}
                onChange={(e) => {
                  const experienceMap: Record<string, number> = {
                    '1-2 years': 2,
                    '3-5 years': 5,
                    '6-10 years': 10,
                    '11-15 years': 15,
                    '16-20 years': 20,
                    '20+ years': 25
                  };
                  setProfileData(prev => ({ 
                    ...prev, 
                    years_of_experience: experienceMap[e.target.value] || 2 
                  }));
                }}
                disabled={!isEditing}
                select={isEditing}
                required
              >
                {EXPERIENCE_LEVELS.map((level) => (
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
                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    placeholder="e.g., Project Management, Python, SEO"
                  />
                  <Button variant="outlined" onClick={addSkill}>
                    Add
                  </Button>
                </Box>
              )}
              
              <Box display="flex" flexWrap="wrap" gap={1}>
                {profileData.key_skills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={isEditing ? () => removeSkill(skill) : undefined}
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {profileData.key_skills.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No skills added yet
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Professional Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Professional Details
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Background & Experience"
                value={profileData.background}
                onChange={(e) => setProfileData(prev => ({ ...prev, background: e.target.value }))}
                disabled={!isEditing}
                multiline
                rows={4}
                placeholder="Detailed description of your professional background, education, and career journey..."
                helperText="This helps the AI understand your expertise depth and experience"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Typical Problems You Solve"
                value={profileData.typical_problems}
                onChange={(e) => setProfileData(prev => ({ ...prev, typical_problems: e.target.value }))}
                disabled={!isEditing}
                multiline
                rows={3}
                placeholder="Describe the types of challenges and problems you typically help clients solve..."
                helperText="This helps the AI understand what kinds of questions to expect"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Methodologies & Frameworks"
                value={profileData.methodologies}
                onChange={(e) => setProfileData(prev => ({ ...prev, methodologies: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g., Agile, Design Thinking, LEAN"
                helperText="Approaches and frameworks you use"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tools & Technologies"
                value={profileData.tools_technologies}
                onChange={(e) => setProfileData(prev => ({ ...prev, tools_technologies: e.target.value }))}
                disabled={!isEditing}
                placeholder="e.g., Salesforce, Adobe Creative Suite, Python"
                helperText="Tools and technologies you work with"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Certifications"
                value={profileData.certifications}
                onChange={(e) => setProfileData(prev => ({ ...prev, certifications: e.target.value }))}
                disabled={!isEditing}
                placeholder="List your relevant professional certifications..."
                helperText="Professional certifications and credentials"
              />
            </Grid>

            {/* Delete Profile Button - Only shown when editing */}
            {isEditing && (
              <Grid item xs={12}>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="error" gutterBottom>
                    Danger Zone
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Deleting your profile will permanently remove all your data and cannot be undone.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={saving}
                  >
                    Delete Profile
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="error">
          Delete Profile
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your profile? This action cannot be undone and will:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            <li>Permanently delete all your profile data</li>
            <li>Remove all your training messages and AI knowledge</li>
            <li>Delete your account completely</li>
          </Box>
          <DialogContentText>
            <strong>This action is irreversible.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProfile}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        open={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        currentEmail={profileData.email}
      />
    </Paper>
  );
};

export default ExpertProfile; 