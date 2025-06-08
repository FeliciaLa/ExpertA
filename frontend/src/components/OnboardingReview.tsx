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
  Snackbar
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { trainingService } from '../services/api';

interface OnboardingAnswer {
  question_id: number;
  question_text: string;
  category: string;
  order: number;
  answer: string;
  created_at: string;
}

interface OnboardingAnswersResponse {
  answers: OnboardingAnswer[];
  total: number;
  onboarding_type?: 'detailed' | 'simplified';
}

export const OnboardingReview: React.FC = () => {
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [onboardingType, setOnboardingType] = useState<'detailed' | 'simplified'>('detailed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchAnswers();
  }, []);

  const fetchAnswers = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getOnboardingAnswers();
      setAnswers(response.answers);
      setOnboardingType(response.onboarding_type || 'detailed');
    } catch (error: any) {
      console.error('Error fetching onboarding answers:', error);
      setError(error.response?.data?.error || 'Failed to fetch onboarding answers');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (answerId: number, currentAnswer: string) => {
    setEditingAnswerId(answerId);
    setEditValue(currentAnswer);
  };

  const handleCancelEdit = () => {
    setEditingAnswerId(null);
    setEditValue('');
  };

  const handleSaveAnswer = async (questionId: number) => {
    if (!editValue.trim()) {
      setError('Answer cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await trainingService.updateOnboardingAnswer({
        question_id: questionId,
        answer: editValue.trim()
      });
      
      // Update local state with new answer
      setAnswers(prevAnswers => 
        prevAnswers.map(a => 
          a.question_id === questionId 
            ? { ...a, answer: editValue.trim() } 
            : a
        )
      );
      
      setSuccess('Answer updated successfully');
      setEditingAnswerId(null);
      
    } catch (error: any) {
      console.error('Error updating answer:', error);
      setError(error.response?.data?.error || 'Failed to update answer');
    } finally {
      setLoading(false);
    }
  };

  if (loading && answers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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

  if (answers.length === 0) {
    if (onboardingType === 'simplified') {
      return (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Profile Setup Complete
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Alert severity="success" sx={{ mb: 2 }}>
            Your expert profile was completed using our simplified setup process.
          </Alert>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Your profile includes your professional title, bio, industry, experience level, and key skills. 
            This information helps the AI understand your expertise and respond appropriately to users.
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            If you'd like to provide more detailed information about your expertise, you can edit your profile 
            or participate in the detailed Q&A training session.
          </Typography>
        </Paper>
      );
    } else {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No completed onboarding answers found.
        </Alert>
      );
    }
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Profile Setup Questions & Answers
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Below are the questions and answers that form the basis of your expert profile. 
        This information helps the AI understand your expertise and respond appropriately.
        Click the edit icon to update your answers.
      </Typography>
      
      {answers.map((item) => (
        <Accordion key={item.question_id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              {item.question_text}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {editingAnswerId === item.question_id ? (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => handleSaveAnswer(item.question_id)}
                    disabled={loading}
                    startIcon={<SaveIcon />}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                  {item.answer}
                </Typography>
                <Button 
                  variant="text" 
                  color="primary" 
                  onClick={() => handleStartEdit(item.question_id, item.answer)}
                  startIcon={<EditIcon />}
                  sx={{ ml: 2 }}
                >
                  Edit
                </Button>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Paper>
  );
};

export default OnboardingReview; 