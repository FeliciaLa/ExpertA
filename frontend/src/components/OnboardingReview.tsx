import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Grid,
  MenuItem,
  Chip
} from '@mui/material';
import { trainingService, expertApi } from '../services/api';

interface OnboardingAnswer {
  id: number;
  question: {
    id: number;
    text: string;
    order: number;
  };
  answer: string;
  created_at: string;
}

interface ExpertProfileData {
  name?: string;
  title?: string;
  bio?: string;
  specialties?: string;
  industry?: string;
  years_of_experience?: number;
  key_skills?: string;
  typical_problems?: string;
  background?: string;
  certifications?: string;
  methodologies?: string;
  tools_technologies?: string;
}

interface OnboardingAnswersResponse {
  answers: OnboardingAnswer[];
  total: number;
  onboarding_type?: 'detailed' | 'simplified';
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

export const OnboardingReview: React.FC = () => {
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [expertProfile, setExpertProfile] = useState<ExpertProfileData | null>(null);
  const [onboardingType, setOnboardingType] = useState<'detailed' | 'simplified'>('detailed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [keySkills, setKeySkills] = useState<string[]>([]);

  useEffect(() => {
    fetchAnswers();
  }, []);

  useEffect(() => {
    if (expertProfile?.key_skills) {
      setKeySkills(expertProfile.key_skills.split(', ').filter(skill => skill.trim()));
    }
  }, [expertProfile]);

  const fetchAnswers = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getOnboardingAnswers() as OnboardingAnswersResponse;
      setAnswers(response.answers || []);
      setOnboardingType(response.onboarding_type || 'detailed');
      
      // If simplified onboarding, fetch expert profile data instead
      if (response.onboarding_type === 'simplified' || response.answers.length === 0) {
        await fetchExpertProfile();
      }
    } catch (error: any) {
      console.error('Error fetching answers:', error);
      setError(error.response?.data?.error || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpertProfile = async () => {
    try {
      const response = await expertApi.getProfile();
      // The response has both top-level fields (title, bio, specialties) and nested profile fields
      const combinedProfile = {
        name: response.name,
        title: response.title,
        bio: response.bio,
        specialties: response.specialties,
        ...response.profile
      };
      setExpertProfile(combinedProfile);
    } catch (error: any) {
      console.error('Error fetching expert profile:', error);
      // Don't set error here as this is secondary data
    }
  };

  const handleEdit = (answerId: number, currentAnswer: string) => {
    setEditingAnswerId(answerId);
    setEditValue(currentAnswer);
  };

  const handleEditField = (fieldName: string, currentValue: string) => {
    console.log('handleEditField called:', fieldName, currentValue);
    setEditingField(fieldName);
    
    // Handle special case for years_of_experience which has a formatted display value
    if (fieldName === 'years_of_experience') {
      // Extract the actual experience level from the formatted string
      const experienceOptions = ['1-2 years', '3-5 years', '6-10 years', '11-15 years', '16-20 years', '20+ years'];
      const currentExperience = experienceOptions.find(option => currentValue.includes(option.split('-')[0])) || experienceOptions[0];
      setEditValue(currentExperience);
    } else {
      setEditValue(currentValue || '');
    }
  };

  const handleSave = async (answerId: number) => {
    try {
      await trainingService.updateOnboardingAnswer({ question_id: answerId, answer: editValue });
      setAnswers(prev => prev.map(answer => 
        answer.id === answerId ? { ...answer, answer: editValue } : answer
      ));
      setEditingAnswerId(null);
      setSuccess('Answer updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update answer');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSaveField = async () => {
    if (!editingField || !expertProfile) return;
    
    try {
      // Prepare the update data based on the field being edited
      let updateData: any = {};
      
      if (['name', 'title', 'bio', 'specialties'].includes(editingField)) {
        // Top-level fields
        if (editingField === 'specialties') {
          // Update specialties with skills format
          updateData[editingField] = `${keySkills.join(', ')}\n\nMethodologies: ${expertProfile.methodologies || ''}\nTools: ${expertProfile.tools_technologies || ''}`;
        } else {
          updateData[editingField] = editValue;
        }
      } else {
        // Profile fields - need to update the profile object
        updateData.profile = {
          ...expertProfile
        };
        
        // Handle years_of_experience specially
        if (editingField === 'years_of_experience') {
          const experienceMap: { [key: string]: number } = {
            '1-2 years': 2,
            '3-5 years': 5,
            '6-10 years': 10,
            '11-15 years': 15,
            '16-20 years': 20,
            '20+ years': 25
          };
          updateData.profile[editingField] = experienceMap[editValue] || 2;
        } else {
          updateData.profile[editingField] = editValue;
        }
      }

      await expertApi.updateProfile(updateData);
      
      // Update local state
      if (editingField === 'years_of_experience') {
        const experienceMap: { [key: string]: number } = {
          '1-2 years': 2,
          '3-5 years': 5,
          '6-10 years': 10,
          '11-15 years': 15,
          '16-20 years': 20,
          '20+ years': 25
        };
        const numericValue = experienceMap[editValue] || 2;
        setExpertProfile(prev => prev ? {
          ...prev,
          years_of_experience: numericValue
        } : null);
      } else {
        setExpertProfile(prev => prev ? {
          ...prev,
          [editingField]: editValue
        } : null);
      }
      
      setEditingField(null);
      setEditValue('');
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update profile');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCancel = () => {
    setEditingAnswerId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !keySkills.includes(skillInput.trim())) {
      const newSkills = [...keySkills, skillInput.trim()];
      setKeySkills(newSkills);
      setSkillInput('');
      
      // Update the profile immediately
      if (expertProfile) {
        const updatedProfile = {
          ...expertProfile,
          key_skills: newSkills.join(', ')
        };
        setExpertProfile(updatedProfile);
        
        // Save to backend
        expertApi.updateProfile({
          specialties: `${newSkills.join(', ')}\n\nMethodologies: ${expertProfile.methodologies || ''}\nTools: ${expertProfile.tools_technologies || ''}`
        });
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = keySkills.filter(skill => skill !== skillToRemove);
    setKeySkills(newSkills);
    
    // Update the profile immediately
    if (expertProfile) {
      const updatedProfile = {
        ...expertProfile,
        key_skills: newSkills.join(', ')
      };
      setExpertProfile(updatedProfile);
      
      // Save to backend
      expertApi.updateProfile({
        specialties: `${newSkills.join(', ')}\n\nMethodologies: ${expertProfile.methodologies || ''}\nTools: ${expertProfile.tools_technologies || ''}`
      });
    }
  };

  // Helper function to get the proper display value for years_of_experience
  const getExperienceDisplayValue = (yearsOfExperience: number | undefined) => {
    if (!yearsOfExperience) return '1-2 years';
    
    if (yearsOfExperience <= 2) return '1-2 years';
    if (yearsOfExperience <= 5) return '3-5 years';
    if (yearsOfExperience <= 10) return '6-10 years';
    if (yearsOfExperience <= 15) return '11-15 years';
    if (yearsOfExperience <= 20) return '16-20 years';
    return '20+ years';
  };

  const renderEditableTextField = (
    fieldName: string,
    label: string,
    value: string,
    multiline: boolean = false,
    rows: number = 1,
    placeholder?: string,
    select?: boolean,
    options?: string[]
  ) => {
    const isEditing = editingField === fieldName;
    console.log(`Rendering ${fieldName}: isEditing=${isEditing}, editingField=${editingField}`);
    
    return (
      <Box>
        <TextField
          fullWidth
          label={label}
          value={isEditing ? editValue : value || ''}
          onChange={(e) => {
            if (isEditing) {
              setEditValue(e.target.value);
            }
          }}
          multiline={multiline}
          rows={multiline ? rows : 1}
          placeholder={placeholder}
          variant="outlined"
          select={select && !isEditing}
          InputProps={{
            readOnly: !isEditing,
            style: { cursor: isEditing ? 'text' : 'pointer' }
          }}
          onClick={() => !isEditing && handleEditField(fieldName, value)}
        >
          {select && options && !isEditing && options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        
        {isEditing && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button 
              variant="contained" 
              size="small"
              onClick={handleSaveField}
            >
              Save
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (answers.length === 0 && onboardingType === 'simplified') {
    return null; // Don't render anything for simplified onboarding - all info is in My Profile section above
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Onboarding Q&A Review
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {answers.map((answer, index) => (
        <Box key={answer.id} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Question {answer.question.order}: {answer.question.text}
          </Typography>
          
          {editingAnswerId === answer.id ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => handleSave(answer.id)}
                >
                  Save
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" paragraph>
                {answer.answer}
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => handleEdit(answer.id, answer.answer)}
              >
                Edit Answer
              </Button>
            </Box>
          )}
          
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Answered on {new Date(answer.created_at).toLocaleDateString()}
          </Typography>
          
          {index < answers.length - 1 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}
    </Paper>
  );
};

export default OnboardingReview; 