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
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

import { useAuth } from '../contexts/AuthContext';
import { expertApi, API_URL } from '../services/api';
import { AccountSettingsModal } from './AccountSettingsModal';
import { features } from '../utils/environment';

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
  
  // Monetization settings
  monetization_enabled: boolean;
  monetization_price: number;
  
  // Stripe Connect
  stripe_account_id?: string;
  stripe_connected: boolean;
}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

const ExpertProfile: React.FC = () => {
  const { expert, refreshExpert } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  console.log('ExpertProfile component mounted/rendered', { expert: expert?.email, onboarding: expert?.onboarding_completed });
  
  // State
  const [activeTab, setActiveTab] = useState(0); // Basic Info tab active by default
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    certifications: '',
    monetization_enabled: false,
    monetization_price: 5,
    stripe_account_id: '',
    stripe_connected: false
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
        certifications: data.profile?.certifications || '',
        monetization_enabled: data.profile?.monetization_enabled || false,
        monetization_price: data.profile?.monetization_price || 5,
        stripe_account_id: data.profile?.stripe_account_id || '',
        stripe_connected: data.profile?.stripe_connected || false
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
          certifications: profileData.certifications,
          monetization_enabled: profileData.monetization_enabled,
          monetization_price: profileData.monetization_price,
          stripe_account_id: profileData.stripe_account_id,
          stripe_connected: profileData.stripe_connected
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
      console.log('isComplete:', isComplete, isComplete ? '✓' : '❌');
      
      if (isComplete && expert && !expert.onboarding_completed) {
        console.log('Profile is complete - marking onboarding as completed');
        try {
          const onboardingData = {
            industry: profileData.industry.join(', '),
            years_of_experience: profileData.years_of_experience,
            key_skills: profileData.key_skills.join(', '),
            background: profileData.background,
            typical_problems: profileData.typical_problems,
            methodologies: profileData.methodologies,
            tools_technologies: profileData.tools_technologies,
            certifications: profileData.certifications,
            monetization_enabled: profileData.monetization_enabled,
            monetization_price: profileData.monetization_price
          };
          await expertApi.completeOnboarding(onboardingData);
          console.log('Onboarding completed successfully');
          if (refreshExpert) {
            await refreshExpert();
          }
        } catch (onboardingErr: any) {
          console.error('Failed to complete onboarding:', onboardingErr);
        }
      }
      
      console.log('=== FRONTEND SAVE DEBUG END ===');
      
      setSuccess('Profile saved successfully!');
      setIsEditing(false);
      
      // Refresh expert context to ensure we have the latest data
      if (refreshExpert) {
        await refreshExpert();
      }
      
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
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
      setProfileData(prev => ({ ...prev, profile_image: response.profile_image }));
      setSuccess('Profile image updated successfully!');
      
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError('Failed to upload image. Please try again.');
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



  const handleConnectStripe = async () => {
    try {
      const tokensStr = localStorage.getItem('tokens');
      if (!tokensStr) {
        throw new Error('No authentication token found');
      }
      
      const tokens = JSON.parse(tokensStr);
      const token = tokens.access;
      
      if (!token) {
        throw new Error('No access token found');
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const expertId = user.id;

      const response = await fetch(`${API_URL}stripe/connect/url/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expert_id: expertId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe Connect URL');
      }

      const data = await response.json();
      // Redirect to Stripe Connect OAuth flow
      window.location.href = data.connect_url;
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      setError('Failed to connect to Stripe. Please try again.');
    }
  };

  const handleDisconnectStripe = async () => {
    try {
      const tokensStr = localStorage.getItem('tokens');
      if (!tokensStr) {
        throw new Error('No authentication token found');
      }
      
      const tokens = JSON.parse(tokensStr);
      const token = tokens.access;
      
      if (!token) {
        throw new Error('No access token found');
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const expertId = user.id;

      const response = await fetch(`${API_URL}stripe/connect/disconnect/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expert_id: expertId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Stripe account');
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        stripe_connected: false
      }));

      setSuccess('Successfully disconnected from Stripe');
    } catch (error) {
      console.error('Error disconnecting from Stripe:', error);
      setError('Failed to disconnect from Stripe. Please try again.');
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
    <Paper sx={{ maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ px: 4, pt: 4, pb: 2 }}>
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
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="profile tabs">
          <Tab icon={<PersonIcon />} label="Basic Info" {...a11yProps(0)} />
          <Tab icon={<LocalOfferIcon />} label="Knowledge Tag" {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Basic Info Tab Content */}
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

          {/* Basic Information Form */}
          <Grid item xs={12} md={9}>
            <Grid container spacing={3}>
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
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Knowledge Tag Tab Content */}
        <Grid container spacing={3}>
          {/* Industry */}
          <Grid item xs={12} md={6}>
            <Box>
              <TextField
                fullWidth
                label="Industry"
                value={profileData.industry.join(', ')}
                disabled={true}
                multiline
                minRows={1}
                maxRows={3}
                helperText={`${profileData.industry.length} industry${profileData.industry.length !== 1 ? 'ies' : ''} selected`}
                InputProps={{
                  readOnly: true,
                }}
              />
              
              {isEditing && (
                <Box sx={{ mt: 1 }}>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Add an industry"
                      value={newIndustry}
                      onChange={(e) => setNewIndustry(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addIndustry()}
                      placeholder="e.g., Technology, Marketing, Healthcare"
                    />
                    <Button variant="outlined" onClick={addIndustry} size="small">
                      Add
                    </Button>
                  </Box>
                </Box>
              )}
              
              <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                {profileData.industry.map((industry) => (
                  <Chip
                    key={industry}
                    label={industry}
                    onDelete={isEditing ? () => removeIndustry(industry) : undefined}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
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

          {/* Key Skills and Techniques */}
          <Grid item xs={12}>
            <Box>
              <TextField
                fullWidth
                label="Key Skills and Techniques"
                value={profileData.key_skills.join(', ')}
                disabled={true}
                multiline
                minRows={1}
                maxRows={3}
                helperText={`${profileData.key_skills.length} skill${profileData.key_skills.length !== 1 ? 's' : ''} and technique${profileData.key_skills.length !== 1 ? 's' : ''} added`}
                InputProps={{
                  readOnly: true,
                }}
              />
              
              {isEditing && (
                <Box sx={{ mt: 1 }}>
                  <Box display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Add a skill or technique"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      placeholder="e.g., Project Management, Python, SEO, Design Thinking"
                    />
                    <Button variant="outlined" onClick={addSkill} size="small">
                      Add
                    </Button>
                  </Box>
                </Box>
              )}
              
              <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                {profileData.key_skills.map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={isEditing ? () => removeSkill(skill) : undefined}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
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
        </Grid>
      </TabPanel>







      {/* Account Settings Modal */}
      <AccountSettingsModal
        open={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        currentEmail={profileData.email}
        isExpert={true}
      />
    </Paper>
  );
};

export default ExpertProfile; 