import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';

interface OnboardingQuestion {
  id: number;
  text: string;
  category: string;
}

interface OnboardingProgress {
  completed: number;
  total: number;
}

interface ExpertOnboardingProps {
  onComplete?: () => void;
  showHeader?: boolean;
}

export const ExpertOnboarding: React.FC<ExpertOnboardingProps> = ({ 
  onComplete, 
  showHeader = true 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<OnboardingQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<OnboardingProgress>({ completed: 0, total: 10 });
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, expert, refreshExpert } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Only fetch next question if onboarding is not completed
    if (!expert?.onboarding_completed) {
      fetchNextQuestion();
    } else {
      navigate('/train');
    }
  }, [isAuthenticated, expert?.onboarding_completed, navigate]);

  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      console.log('Fetching next onboarding question...');
      const response = await trainingService.getOnboardingStatus();
      console.log('Onboarding API response:', response);
      
      if (response.is_completed) {
        setShowCompletionDialog(true);
        return;
      }

      if (response.next_question) {
        setCurrentQuestion(response.next_question);
        setProgress({
          completed: response.progress.completed_questions,
          total: response.progress.total_questions
        });
      }
    } catch (error: any) {
      console.error('Error fetching question:', error);
      console.log('Error response data:', error.response?.data);
      console.log('Error message:', error.message);
      setErrorMessage(error.response?.data?.error || 'Failed to fetch next question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim() || loading) return;

    try {
      setLoading(true);
      await trainingService.submitOnboardingAnswer({
        question_id: currentQuestion.id,
        answer: answer.trim()
      });
      setAnswer('');
      const response = await trainingService.getOnboardingStatus();
      
      if (response.is_completed) {
        // Refresh expert data before showing completion dialog
        await refreshExpert();
        setShowCompletionDialog(true);
      } else {
        setCurrentQuestion(response.next_question);
        setProgress({
          completed: response.progress.completed_questions,
          total: response.progress.total_questions
        });
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    try {
      setLoading(true);
      // Refresh expert data one more time before navigating
      await refreshExpert();
      setShowCompletionDialog(false);
      
      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
        return;
      }
      
      // Otherwise navigate to training page
      navigate('/train');
    } catch (error) {
      console.error('Error starting training:', error);
      setErrorMessage('Failed to start training. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionHelper = (category: string) => {
    const helpers: { [key: string]: string } = {
      background: "Share your professional background and experience",
      expertise: "Describe your areas of expertise and specialization",
      methodology: "Explain your approach and methods in your field",
      challenges: "Discuss challenges you've overcome in your work",
      achievements: "Highlight significant achievements and contributions"
    };
    return helpers[category] || "Please provide a detailed answer";
  };

  if (!currentQuestion && !showCompletionDialog) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {showHeader && (
        <Typography variant="h4" gutterBottom>
          Expert Profile Setup
        </Typography>
      )}

      <Box sx={{ width: '100%' }}>
        <Typography variant="body1" gutterBottom>
          Help us understand your expertise by answering a few questions. This will allow the AI
          to learn from your knowledge more effectively during the training process.
        </Typography>

        <Box sx={{ my: 2 }}>
          <LinearProgress
            variant="determinate"
            value={(progress.completed / progress.total) * 100}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Progress: {progress.completed} of {progress.total} questions completed
          </Typography>
        </Box>

        {currentQuestion && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              {currentQuestion.text}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading}
              placeholder={getQuestionHelper(currentQuestion.category)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitAnswer}
              disabled={loading || !answer.trim()}
            >
              {loading ? <CircularProgress size={24} /> : 'Submit Answer'}
            </Button>
          </Box>
        )}
      </Box>

      <Dialog open={showCompletionDialog} onClose={() => setShowCompletionDialog(false)}>
        <DialogTitle>Profile Setup Complete!</DialogTitle>
        <DialogContent>
          <Typography>
            Thank you for completing your expert profile. You can now start training the AI
            through natural conversation. The AI will use your profile information to guide
            the conversation and gather knowledge effectively.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleStartTraining} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Start Training'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={() => setErrorMessage(null)}>
        <Alert onClose={() => setErrorMessage(null)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 