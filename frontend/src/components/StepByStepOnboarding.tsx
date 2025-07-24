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
  LinearProgress,
  IconButton,
  FormControlLabel,
  Checkbox,
  Modal
} from '@mui/material';
import { ArrowBack, ArrowForward, CheckCircle, InfoOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { expertApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { features } from '../utils/environment';
import ExpertActivationPayment from './ExpertSubscriptionPayment';

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
  expertise: string;
  industry: string[];
  years_of_experience: number;
  background: string;
  key_skills: string[];
  typical_problems: string;
  tools_technologies: string;
  certifications: string;
  bio: string;
  subscription_completed: boolean;
  completion: string;
}

const stepSections = [
  {
    title: 'Basic Info',
    description: 'Let\'s start with the basics',
    steps: [
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
        label: 'Industry',
        description: 'Which industry do you work in?',
        field: 'industry'
      }
    ]
  },
  {
    title: 'Experience Info',
    description: 'Tell us about your expertise and experience',
    steps: [
      {
        label: 'Describe Your Expertise',
        description: 'What do you specialize in? What\'s your core area of expertise?',
        field: 'expertise'
      },
      {
        label: 'Experience Level',
        description: 'How many years of experience do you have?',
        field: 'years_of_experience'
      },
      {
        label: 'Professional Background',
        description: 'Tell us about your professional journey - how did you develop your expertise?',
        field: 'background'
      }
    ]
  },
  {
    title: 'Skills & Knowledge',
    description: 'Share your skills and what problems you solve',
    steps: [
      {
        label: 'Key Skills',
        description: 'What are your main skills and competencies?',
        field: 'key_skills'
      },
      {
        label: 'Techniques & Tools',
        description: 'What techniques, tools and technologies do you work with?',
        field: 'tools_technologies'
      },
      {
        label: 'Certifications',
        description: 'Any relevant certifications or qualifications?',
        field: 'certifications'
      },
      {
        label: 'Typical Problems You Solve',
        description: 'What types of problems do you typically help clients with?',
        field: 'typical_problems'
      }
    ]
  },
  {
    title: 'Professional Profile',
    description: 'Complete your professional profile',
    steps: [
      {
        label: 'Professional Bio',
        description: 'Write your professional bio which will be visible to clients',
        field: 'bio'
      }
    ]
  },
  {
    title: 'Activate Your AI Expert',
    description: 'Pay £9.99 to unlock AI training capabilities, build your AI duplicate and receive your sharable link.',
    steps: [
      {
        label: 'Activate Your AI',
        description: 'One-time payment of £9.99 to unlock AI training and get 200 user interactions',
        field: 'subscription'
      }
    ]
  },
  {
    title: 'Finish Setup',
    description: 'Complete your setup',
    steps: [
      {
        label: 'Complete Setup',
        description: 'Final step to complete your profile',
        field: 'disclaimer'
      }
    ]
  }
];

// Filter out monetization section if payments are disabled
const filteredStepSections = features.payments 
  ? stepSections 
  : stepSections.filter(section => section.title !== 'Monetization');

// Flatten steps for compatibility with existing code
const steps = filteredStepSections.flatMap(section => section.steps);

const StepByStepOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({
    name: '',
    title: '',
    expertise: '',
    industry: [],
    years_of_experience: 1,
    background: '',
    key_skills: [],
    typical_problems: '',
    tools_technologies: '',
    certifications: '',
    bio: '',
    subscription_completed: false,
    completion: ''
  });
  
  const [currentValue, setCurrentValue] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const { expert, refreshExpert } = useAuth();



  // Helper functions for section management
  const getCurrentSection = () => {
    let stepCount = 0;
    for (let i = 0; i < stepSections.length; i++) {
      if (activeStep < stepCount + stepSections[i].steps.length) {
        return { 
          section: stepSections[i], 
          sectionIndex: i, 
          stepInSection: activeStep - stepCount,
          totalInSection: stepSections[i].steps.length 
        };
      }
      stepCount += stepSections[i].steps.length;
    }
    return { section: stepSections[0], sectionIndex: 0, stepInSection: 0, totalInSection: stepSections[0].steps.length };
  };

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

  // Auto-save for text fields when value changes (with debounce)
  useEffect(() => {
    const currentField = steps[activeStep]?.field;
    if (!currentField || currentField === 'completion' || 
        currentField === 'key_skills' || currentField === 'industry' || 
        currentField === 'monetization_enabled') {
      return; // Skip auto-save for these fields
    }

    const timeoutId = setTimeout(() => {
      if (currentValue.trim()) {
        saveCurrentFieldQuietly();
      }
    }, 2000); // Save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [currentValue, activeStep]);

  const loadExistingData = async () => {
    try {
      const profile = await expertApi.getProfile();
      
      // Helper function to safely parse array fields that might be JSON strings or comma-separated strings
      const parseArrayField = (field: string | undefined | null): string[] => {
        if (!field || field.trim() === '') return [];
        
        // First, try to parse as JSON (handles cases like '["Tech", "Marketing"]')
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) {
            return parsed.filter((item: any) => typeof item === 'string' && item.trim().length > 0);
          }
        } catch (e) {
          // Not valid JSON, continue with comma-separated parsing
        }
        
        // Fallback to comma-separated parsing (handles cases like 'Tech, Marketing')
        return field.split(/,\s*/).filter((item: string) => item.trim().length > 0);
      };
      
      const existingData = {
        name: profile.name || '',
        title: profile.title || '',
        expertise: profile.specialties || '',
        industry: parseArrayField(profile.profile?.industry),
        years_of_experience: profile.profile?.years_of_experience || 1,
        background: profile.profile?.background || '',
        key_skills: parseArrayField(profile.profile?.key_skills),
        typical_problems: profile.profile?.typical_problems || '',
        tools_technologies: profile.profile?.tools_technologies || '',
        certifications: profile.profile?.certifications || '',
        bio: profile.bio || '',
        subscription_completed: false, // Will be updated after payment
        completion: ''
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
      // Last step - complete onboarding and show modal
      await completeOnboarding();
      setShowCompletionModal(true);
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const validateCurrentField = () => {
    const currentField = steps[activeStep].field;
    
    // Disclaimer step requires disclaimer acceptance
    if (currentField === 'disclaimer') {
      if (!disclaimerAccepted) {
        setError('Please accept the disclaimer to continue');
        return false;
      }
      setError(null);
      return true;
    }
    
    if (currentField === 'key_skills') {
      if ((stepData.key_skills || []).length === 0) {
        setError('Please add at least one skill');
        return false;
      }
    } else if (currentField === 'industry') {
      if ((stepData.industry || []).length === 0) {
        setError('Please add at least one industry');
        return false;
      }
    } else if (currentField === 'years_of_experience') {
      if (!currentValue || parseInt(currentValue) < 1) {
        setError('Please select your experience level');
        return false;
      }
    } else if (currentField === 'subscription') {
      if (!stepData.subscription_completed) {
        setError('Please complete your subscription to continue');
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
    const currentField = steps[activeStep].field;
    
    // Skip saving for completion step
    if (currentField === 'completion') {
      return;
    }
    
    try {
      setLoading(true);
      
      let updateData: any = {};
      
      if (['name', 'title', 'bio', 'expertise'].includes(currentField)) {
        // Basic fields - update user model (expertise maps to specialties in backend)
        updateData[currentField] = currentValue;
      } else {
        // Profile fields - update expert profile
        let fieldValue;
        if (currentField === 'key_skills') {
          fieldValue = Array.isArray(stepData.key_skills) ? stepData.key_skills.join(', ') : stepData.key_skills;
        } else if (currentField === 'industry') {
          // Ensure we always save as comma-separated string, never JSON
          fieldValue = Array.isArray(stepData.industry) ? stepData.industry.join(', ') : stepData.industry;
        } else if (currentField === 'subscription') {
          // Skip saving subscription field - handled by payment component
          return;
        } else {
          fieldValue = currentValue;
        }
        
        // Only send the specific field being updated to avoid array/object conflicts
        updateData.profile = {
          [currentField]: fieldValue
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

  const saveCurrentFieldQuietly = async () => {
    const currentField = steps[activeStep].field;
    
    // Skip saving for completion step
    if (currentField === 'completion') {
      return;
    }
    
    try {
      let updateData: any = {};
      
      if (['name', 'title', 'bio', 'expertise'].includes(currentField)) {
        // Basic fields - update user model (expertise maps to specialties in backend)
        updateData[currentField] = currentValue;
      } else {
        // Profile fields - update expert profile
        let fieldValue;
        if (currentField === 'key_skills') {
          fieldValue = Array.isArray(stepData.key_skills) ? stepData.key_skills.join(', ') : stepData.key_skills;
        } else if (currentField === 'industry') {
          // Ensure we always save as comma-separated string, never JSON
          fieldValue = Array.isArray(stepData.industry) ? stepData.industry.join(', ') : stepData.industry;
        } else if (currentField === 'subscription') {
          // Skip saving subscription field - handled by payment component
          return;
        } else {
          fieldValue = currentValue;
        }
        
        // Only send the specific field being updated to avoid array/object conflicts
        updateData.profile = {
          [currentField]: fieldValue
        };
      }

      await expertApi.updateProfile(updateData);
    } catch (error) {
      // Fail silently for auto-save
      console.error('Auto-save failed:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setCompleting(true);
      
      // Prepare final onboarding data
      const onboardingData = {
        name: stepData.name,
        title: stepData.title,
        bio: stepData.bio,
        // expertise: stepData.expertise,
        industry: (stepData.industry || []).join(', '),
        years_of_experience: stepData.years_of_experience,
        background: stepData.background,
        key_skills: (stepData.key_skills || []).join(', '),
        typical_problems: stepData.typical_problems || `As a ${stepData.title}, I help clients solve complex challenges in my field.`,
        certifications: stepData.certifications,
        tools_technologies: stepData.tools_technologies,
        monetization_enabled: false, // Default - expert activation model
        monetization_price: 0 // Not used in new model
      };

      await expertApi.completeOnboarding(onboardingData);
      
      // Refresh expert data
      await refreshExpert();
      
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setError('Failed to complete setup. Please try again.');
      setCompleting(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !(stepData.key_skills || []).includes(newSkill.trim())) {
      setStepData(prev => ({
        ...prev,
        key_skills: [...(prev.key_skills || []), newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setStepData(prev => ({
      ...prev,
      key_skills: (prev.key_skills || []).filter(skill => skill !== skillToRemove)
    }));
  };

  const addIndustry = () => {
    if (newIndustry.trim() && !(stepData.industry || []).includes(newIndustry.trim())) {
      setStepData(prev => ({
        ...prev,
        industry: [...(prev.industry || []), newIndustry.trim()]
      }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (industryToRemove: string) => {
    setStepData(prev => ({
      ...prev,
      industry: (prev.industry || []).filter(industry => industry !== industryToRemove)
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

      case 'expertise':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Describe Your Expertise"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="e.g., I specialize in digital marketing strategy for SaaS companies, with deep expertise in conversion optimization and growth hacking..."
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

      case 'disclaimer':
        return (
          <Box sx={{ py: 4 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  I understand that this chatbot is still in development, and results may not always reflect my intended tone, accuracy, or views. I acknowledge that some outputs may be incomplete, inaccurate, or unexpected, and I will not upload confidential or sensitive materials.
                </Typography>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
          </Box>
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
              {(stepData.industry || []).map((industry, index) => (
                <Chip
                  key={index}
                  label={industry}
                  onDelete={() => removeIndustry(industry)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            
            {(stepData.industry || []).length === 0 && (
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
              {(stepData.key_skills || []).map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  onDelete={() => removeSkill(skill)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            
            {(stepData.key_skills || []).length === 0 && (
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
        
      case 'tools_technologies':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Techniques & Tools"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="What techniques, tools, software, or technologies do you use regularly?"
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
            placeholder="List any relevant certifications, degrees, or qualifications"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );
        
      case 'subscription':
        return (
          <ExpertActivationPayment
            onPaymentSuccess={() => {
              setStepData(prev => ({ ...prev, subscription_completed: true }));
              setCurrentValue('completed');
              setError(null);
            }}
            onClose={() => {
              setError('Payment required to activate your AI expert');
            }}
          />
        );
        
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              How much would you like to earn for each 15-minute consultation?*
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="£"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="15"
              variant="outlined"
              inputProps={{ min: 1, max: 100, step: 1 }}
              sx={{ mt: 2, maxWidth: 200 }}
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>You earn:</strong> £{currentValue || '0'} per consultation
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                <strong>Clients will pay:</strong> £{(parseFloat(currentValue || '0') * 1.2).toFixed(2)} total
              </Typography>
            </Box>
            <Typography variant="body2" color="primary" sx={{ mt: 2, fontStyle: 'italic' }}>
              💡 Set a price you feel reflects your time and knowledge — you can adjust it whenever you like.
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 3, display: 'block', borderTop: 1, borderColor: 'divider', pt: 2 }}>
              *Clients pay 20% extra to cover platform services like hosting, secure payments, and maintenance. You receive 100% of your chosen rate.
            </Typography>
          </Box>
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
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
          Your profile has been set up successfully. You can now start training your AI.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/train')}
          sx={{ mt: 2 }}
        >
          Start Training AI
        </Button>
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

  const currentSectionInfo = getCurrentSection();

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

        {/* Section Header */}
        <Box sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body1" color="primary" sx={{ fontWeight: 500 }}>
            {currentSectionInfo.section.title}
          </Typography>
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
            disabled={loading || (steps[activeStep].field === 'disclaimer' && !disclaimerAccepted)}
            endIcon={loading ? <CircularProgress size={20} /> : 
              activeStep === steps.length - 1 ? <CheckCircle /> : <ArrowForward />}
          >
            {loading ? 'Saving...' : activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {/* Completion Modal */}
      <Modal
        open={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          navigate('/train');
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
          <Typography variant="h4" gutterBottom color="primary">
            🎉 Profile Complete!
          </Typography>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
            Congratulations! Your expert profile is ready
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            You've successfully set up your expert profile with all your skills, experience, and expertise. 
            Now it's time to train your AI assistant.
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setShowCompletionModal(false);
              navigate('/train');
            }}
            fullWidth
            size="large"
          >
            Start Training Your AI
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default StepByStepOnboarding; 