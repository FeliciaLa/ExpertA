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
import { trainingService } from '../services/api';

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

interface TrainingMessage {
  id: number;
  role: 'ai' | 'expert';
  content: string;
  created_at: string;
  context_depth: number;
  knowledge_area: string;
}

interface OnboardingAnswersResponse {
  answers: OnboardingAnswer[];
  total: number;
  onboarding_type?: 'detailed' | 'simplified';
}

export const OnboardingReview: React.FC = () => {
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [trainingMessages, setTrainingMessages] = useState<TrainingMessage[]>([]);
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
      const response = await trainingService.getOnboardingAnswers() as OnboardingAnswersResponse;
      setAnswers(response.answers || []);
      setOnboardingType(response.onboarding_type || 'detailed');
      
      // If simplified onboarding, fetch training messages instead
      if (response.onboarding_type === 'simplified' || response.answers.length === 0) {
        await fetchTrainingMessages();
      }
    } catch (error: any) {
      console.error('Error fetching answers:', error);
      setError(error.response?.data?.error || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainingMessages = async () => {
    try {
      const response = await trainingService.getChatHistory();
      const expertMessages = response.messages.filter((msg: TrainingMessage) => 
        msg.role === 'expert' && msg.content !== 'START_TRAINING'
      );
      setTrainingMessages(expertMessages);
    } catch (error: any) {
      console.error('Error fetching training messages:', error);
      // Don't set error here as this is secondary data
    }
  };

  const handleEdit = (answerId: number, currentAnswer: string) => {
    setEditingAnswerId(answerId);
    setEditValue(currentAnswer);
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

  const handleCancel = () => {
    setEditingAnswerId(null);
    setEditValue('');
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
          Training Q&A Answers
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {trainingMessages.length > 0 ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your expertise is being captured through AI training conversations. Here are your responses:
            </Alert>
            
            {trainingMessages.map((message, index) => (
              <Box key={message.id} sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Training Response #{index + 1}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {message.knowledge_area && (
                    <Chip 
                      label={message.knowledge_area} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                  {new Date(message.created_at).toLocaleDateString()}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {message.content}
                </Typography>
              </Box>
            ))}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Continue training in the Q&A Training tab to provide more detailed responses and improve your AI assistant.
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