import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Snackbar,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
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

  useEffect(() => {
    fetchAnswers();
  }, []);

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
    setEditingField(fieldName);
    setEditValue(currentValue || '');
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
      
      if (['title', 'bio', 'specialties'].includes(editingField)) {
        // Top-level fields
        updateData[editingField] = editValue;
      } else {
        // Profile fields - need to update the profile object
        updateData.profile = {
          ...expertProfile,
          [editingField]: editingField === 'years_of_experience' ? parseInt(editValue) || 0 : editValue
        };
      }

      await expertApi.updateProfile(updateData);
      
      // Update local state
      setExpertProfile(prev => prev ? {
        ...prev,
        [editingField]: editingField === 'years_of_experience' ? parseInt(editValue) || 0 : editValue
      } : null);
      
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

  const renderEditableField = (fieldName: string, label: string, value: string, multiline: boolean = false) => {
    const isEditing = editingField === fieldName;
    
    return (
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="primary" gutterBottom>
          {label}
        </Typography>
        
        {isEditing ? (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline={multiline}
              rows={multiline ? 4 : 1}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" paragraph>
              {value || 'Not specified'}
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => handleEditField(fieldName, value)}
            >
              Edit
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
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" color="primary" gutterBottom>
          Expert Profile Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {expertProfile ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your expert profile was completed using our simplified setup process. Here's your information:
            </Alert>
            
            {renderEditableField('title', 'Professional Title', expertProfile.title || '')}
            {renderEditableField('bio', 'Bio', expertProfile.bio || '', true)}
            {renderEditableField('specialties', 'Specialties', expertProfile.specialties || '', true)}
            {renderEditableField('industry', 'Industry', expertProfile.industry || '')}
            {renderEditableField('years_of_experience', 'Years of Experience', expertProfile.years_of_experience?.toString() || '')}
            {renderEditableField('key_skills', 'Key Skills', expertProfile.key_skills || '', true)}
            {renderEditableField('background', 'Background', expertProfile.background || '', true)}
            {renderEditableField('typical_problems', 'Typical Problems I Help Solve', expertProfile.typical_problems || '', true)}
            {renderEditableField('certifications', 'Certifications', expertProfile.certifications || '', true)}
            {renderEditableField('methodologies', 'Methodologies', expertProfile.methodologies || '')}
            {renderEditableField('tools_technologies', 'Tools & Technologies', expertProfile.tools_technologies || '')}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              This information helps the AI understand your expertise and respond appropriately to users. 
              You can edit your profile information in the profile settings.
            </Typography>
          </>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Your expert profile was completed using our simplified setup process.
            </Alert>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Your profile includes your professional title, bio, industry, experience level, and key skills. 
              This information helps the AI understand your expertise and respond appropriately to users.
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              To provide more detailed information about your expertise, you can participate in the Q&A training session 
              where the AI will ask you specific questions about your field.
            </Typography>
          </>
        )}
      </Paper>
    );
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