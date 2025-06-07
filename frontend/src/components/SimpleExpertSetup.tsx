import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { expertApi } from '../services/api';

interface ExpertSetupData {
  name: string;
  title: string;
  bio: string;
  industry: string;
  yearsExperience: string;
  keySkills: string[];
  specialties: string;
  methodologies: string;
  tools: string;
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

export const SimpleExpertSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { expert, refreshExpert } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState<ExpertSetupData>({
    name: expert?.name || '',
    title: expert?.title || '',
    bio: expert?.bio || '',
    industry: '',
    yearsExperience: '',
    keySkills: [],
    specialties: expert?.specialties || '',
    methodologies: '',
    tools: ''
  });

  const handleInputChange = (field: keyof ExpertSetupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.keySkills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keySkills: [...prev.keySkills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keySkills: prev.keySkills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim() || !formData.title.trim() || !formData.bio.trim() || 
        !formData.industry || !formData.yearsExperience || formData.keySkills.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update basic profile
      await expertApi.updateProfile({
        name: formData.name,
        title: formData.title,
        bio: formData.bio,
        specialties: `${formData.keySkills.join(', ')}\n\nMethodologies: ${formData.methodologies}\nTools: ${formData.tools}`
      });

      // Create expert profile data (simulating the onboarding answers)
      const profileData = {
        industry: formData.industry,
        years_of_experience: parseInt(formData.yearsExperience.split('-')[0]) || 1,
        key_skills: formData.keySkills.join(', '),
        typical_problems: `As a ${formData.title} with ${formData.yearsExperience} of experience in ${formData.industry}, I help clients solve complex challenges in my field.`,
        background: formData.bio,
        certifications: '',
        methodologies: formData.methodologies,
        tools_technologies: formData.tools
      };

      // Mark onboarding as complete
      await expertApi.completeOnboarding(profileData);
      
      // Refresh expert data
      await refreshExpert();
      
      onComplete();
    } catch (error: any) {
      console.error('Error completing setup:', error);
      setError(error.response?.data?.error || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom color="primary">
        Complete Your Expert Profile
      </Typography>
      
      <Typography variant="body1" paragraph color="text.secondary">
        Help us understand your expertise so we can train an AI that represents you accurately. 
        This takes just a few minutes and you can always update it later.
      </Typography>

      <Divider sx={{ my: 3 }} />

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
            label="Full Name *"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Professional Title *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Senior Marketing Manager, Data Scientist"
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Professional Bio *"
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Describe your background, experience, and what makes you unique as an expert..."
            variant="outlined"
          />
        </Grid>

        {/* Experience */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Experience & Expertise
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Industry *"
            value={formData.industry}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            variant="outlined"
          >
            {INDUSTRIES.map((industry) => (
              <MenuItem key={industry} value={industry}>
                {industry}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Years of Experience *"
            value={formData.yearsExperience}
            onChange={(e) => handleInputChange('yearsExperience', e.target.value)}
            variant="outlined"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Skills */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Key Skills *
          </Typography>
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {formData.keySkills.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                onDelete={() => handleRemoveSkill(skill)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Grid>

        {/* Optional Details */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Additional Details (Optional)
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Methodologies & Frameworks"
            value={formData.methodologies}
            onChange={(e) => handleInputChange('methodologies', e.target.value)}
            placeholder="e.g., Agile, Design Thinking, LEAN"
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tools & Technologies"
            value={formData.tools}
            onChange={(e) => handleInputChange('tools', e.target.value)}
            placeholder="e.g., Salesforce, Adobe Creative Suite, Python"
            variant="outlined"
          />
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Complete Setup & Start Training'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}; 