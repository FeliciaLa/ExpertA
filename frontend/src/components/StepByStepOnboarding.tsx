import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  LinearProgress
} from '@mui/material';
import { ArrowBack, ArrowForward, CheckCircle } from '@mui/icons-material';
import { expertApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

const EXPERIENCE_OPTIONS = [
  { value: 1, label: '1-2 years' },
  { value: 3, label: '3-5 years' },
  { value: 6, label: '6-10 years' },
  { value: 11, label: '11-15 years' },
  { value: 16, label: '16-20 years' },
  { value: 20, label: '20+ years' }
];

interface StepData {
  name: string;
  title: string;
  bio: string;
  industry: string[];
  years_of_experience: number;
  key_skills: string[];
  background: string;
  typical_problems: string;
  methodologies: string;
  tools_technologies: string;
  certifications: string;
}

const steps = [
  {
    label: 'Your Name',
    description: 'Let us know what to call you',
    field: 'name'
  },
  {
    label: 'Professional Title',
    description: 'What is your current role or expertise?',
    field: 'title'
  },
  {
    label: 'Professional Bio',
    description: 'Write a short description that will be shown to potential clients',
    field: 'bio'
  },
  {
    label: 'Industry',
    description: 'Which industry do you work in?',
    field: 'industry'
  },
  {
    label: 'Experience Level',
    description: 'How many years of experience do you have?',
    field: 'years_of_experience'
  },
  {
    label: 'Professional Background',
    description: 'Describe your professional background and expertise',
    field: 'background'
  },
  {
    label: 'Key Skills',
    description: 'What are your main skills and competencies?',
    field: 'key_skills'
  },
  {
    label: 'Typical Problems You Solve',
    description: 'What types of problems do you typically help clients with?',
    field: 'typical_problems'
  },
  {
    label: 'Methodologies',
    description: 'What methodologies or frameworks do you use?',
    field: 'methodologies'
  },
  {
    label: 'Tools & Technologies',
    description: 'What tools and technologies do you work with?',
    field: 'tools_technologies'
  },
  {
    label: 'Certifications',
    description: 'Any relevant certifications or qualifications?',
    field: 'certifications'
  }
];

const StepByStepOnboarding: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({
    name: '',
    title: '',
    bio: '',
    industry: [],
    years_of_experience: 1,
    key_skills: [],
    background: '',
    typical_problems: '',
    methodologies: '',
    tools_technologies: '',
    certifications: ''
  });
  
  const [currentValue, setCurrentValue] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  
  const { expert, refreshExpert } = useAuth();

  // Load existing profile data on mount
  useEffect(() => {
    loadExistingData();
  }, []);

  // Update current value when step changes
  useEffect(() => {
    const currentField = steps[activeStep]?.field;
    if (currentField && stepData) {
      setCurrentValue(stepData[currentField as keyof StepData]?.toString() || '');
    }
  }, [activeStep, stepData]);

  const loadExistingData = async () => {
    try {
      const profile = await expertApi.getProfile();
      const existingData = {
        name: profile.name || '',
        title: profile.title || '',
        bio: profile.bio || '',
        industry: profile.profile?.industry ? profile.profile.industry.split(', ') : [],
        years_of_experience: profile.profile?.years_of_experience || 1,
        key_skills: profile.profile?.key_skills ? profile.profile.key_skills.split(', ') : [],
        background: profile.profile?.background || '',
        typical_problems: profile.profile?.typical_problems || '',
        methodologies: profile.profile?.methodologies || '',
        tools_technologies: profile.profile?.tools_technologies || '',
        certifications: profile.profile?.certifications || ''
      };
      setStepData(existingData);
    } catch (error) {
      console.error('Failed to load existing profile data:', error);
    }
  };

  const handleNext = async () => {
    const currentField = steps[activeStep].field;
    
    // Validate current field
    if (!validateCurrentField()) {
      return;
    }

    // Save current field value
    setStepData(prev => ({
      ...prev,
      [currentField]: currentField === 'key_skills' ? prev.key_skills : 
                     currentField === 'industry' ? prev.industry : currentValue
    }));

    // Save to backend
    await saveCurrentField();

    if (activeStep === steps.length - 1) {
      // Last step - complete onboarding
      await completeOnboarding();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const validateCurrentField = () => {
    const currentField = steps[activeStep].field;
    
    if (currentField === 'key_skills') {
      if (stepData.key_skills.length === 0) {
        setError('Please add at least one skill');
        return false;
      }
    } else if (currentField === 'industry') {
      if (stepData.industry.length === 0) {
        setError('Please add at least one industry');
        return false;
      }
    } else if (currentField === 'years_of_experience') {
      if (!currentValue || parseInt(currentValue) < 1) {
        setError('Please select your experience level');
        return false;
      }
    } else if (!currentValue.trim()) {
      setError('This field is required');
      return false;
    }
    
    setError(null);
    return true;
  };

  const saveCurrentField = async () => {
    try {
      setLoading(true);
      const currentField = steps[activeStep].field;
      
      let updateData: any = {};
      
      if (['name', 'title', 'bio'].includes(currentField)) {
        // Basic fields - update user model
        updateData[currentField] = currentValue;
      } else {
        // Profile fields - update expert profile
        updateData.profile = {
          ...stepData,
          [currentField]: currentField === 'key_skills' ? stepData.key_skills : 
                         currentField === 'industry' ? stepData.industry : currentValue
        };
      }

      await expertApi.updateProfile(updateData);
    } catch (error) {
      console.error('Failed to save field:', error);
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setCompleting(true);
      
      // Prepare final onboarding data
      const onboardingData = {
        industry: stepData.industry.join(', '),
        years_of_experience: stepData.years_of_experience,
        key_skills: stepData.key_skills.join(', '),
        typical_problems: stepData.typical_problems || `As a ${stepData.title}, I help clients solve complex challenges in my field.`,
        background: stepData.background,
        certifications: stepData.certifications,
        methodologies: stepData.methodologies,
        tools_technologies: stepData.tools_technologies
      };

      await expertApi.completeOnboarding(onboardingData);
      await refreshExpert();
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !stepData.key_skills.includes(newSkill.trim())) {
      setStepData(prev => ({
        ...prev,
        key_skills: [...prev.key_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setStepData(prev => ({
      ...prev,
      key_skills: prev.key_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addIndustry = () => {
    if (newIndustry.trim() && !stepData.industry.includes(newIndustry.trim())) {
      setStepData(prev => ({
        ...prev,
        industry: [...prev.industry, newIndustry.trim()]
      }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (industryToRemove: string) => {
    setStepData(prev => ({
      ...prev,
      industry: prev.industry.filter(industry => industry !== industryToRemove)
    }));
  };

  const renderStepContent = () => {
    const currentField = steps[activeStep].field;
    
    switch (currentField) {
      case 'name':
        return (
          <TextField
            fullWidth
            label="Your Full Name"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="e.g., John Smith"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'title':
        return (
          <TextField
            fullWidth
            label="Professional Title"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="e.g., Senior Marketing Manager, UX Designer, Financial Advisor"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'bio':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Professional Bio"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="Write a short, compelling bio that potential clients will see. Highlight your expertise and what makes you unique..."
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'industry':
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Add an industry"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="e.g., Technology, Marketing, Healthcare"
                  variant="outlined"
                  onKeyPress={(e) => e.key === 'Enter' && addIndustry()}
                />
              </Grid>
              <Grid item xs={4}>
                <Button
                  variant="contained"
                  onClick={addIndustry}
                  disabled={!newIndustry.trim()}
                  fullWidth
                >
                  Add Industry
                </Button>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {stepData.industry.map((industry, index) => (
                <Chip
                  key={index}
                  label={industry}
                  onDelete={() => removeIndustry(industry)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            
            {stepData.industry.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Add at least one industry to continue
              </Typography>
            )}
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Suggested: {INDUSTRIES.slice(0, 5).join(', ')}, and more...
            </Typography>
          </Box>
        );
        
      case 'years_of_experience':
        return (
          <TextField
            fullWidth
            select
            label="Years of Experience"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            {EXPERIENCE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        );
        
      case 'key_skills':
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={8}>
                <TextField
                  fullWidth
                  label="Add a skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g., Project Management, Data Analysis"
                  variant="outlined"
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                />
              </Grid>
              <Grid item xs={4}>
                <Button
                  variant="contained"
                  onClick={addSkill}
                  disabled={!newSkill.trim()}
                  fullWidth
                >
                  Add Skill
                </Button>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {stepData.key_skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  onDelete={() => removeSkill(skill)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            
            {stepData.key_skills.length === 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Add at least one skill to continue
              </Typography>
            )}
          </Box>
        );
        
      case 'background':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Professional Background"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="Describe your professional journey, key experiences, and areas of expertise..."
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'typical_problems':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Typical Problems You Solve"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="What types of challenges do you help clients overcome? What problems do you typically solve?"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'methodologies':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Methodologies & Frameworks"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="What methodologies, frameworks, or approaches do you use in your work? (Optional)"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'tools_technologies':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Tools & Technologies"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="What tools, software, or technologies do you use regularly? (Optional)"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'certifications':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Certifications & Qualifications"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="List any relevant certifications, degrees, or qualifications (Optional)"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      default:
        return null;
    }
  };

  if (expert?.onboarding_completed) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Setup Complete!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Your profile has been set up successfully. You can now start training your AI.
        </Typography>
      </Box>
    );
  }

  if (completing) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Completing Your Setup...
        </Typography>
        <Typography variant="body1" color="textSecondary">
          We're finalizing your profile and setting up your AI assistant.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" color="primary" gutterBottom textAlign="center">
          Complete Your Expert Profile
        </Typography>
        
        <Typography variant="body1" color="textSecondary" textAlign="center" sx={{ mb: 4 }}>
          Let's set up your profile step by step to create your personalized AI assistant
        </Typography>

        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Step {activeStep + 1} of {steps.length}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={((activeStep + 1) / steps.length) * 100} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Current Step */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            {steps[activeStep].label}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {steps[activeStep].description}
          </Typography>
          
          {renderStepContent()}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || loading}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            endIcon={loading ? <CircularProgress size={20} /> : 
              activeStep === steps.length - 1 ? <CheckCircle /> : <ArrowForward />}
          >
            {loading ? 'Saving...' : activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StepByStepOnboarding; 