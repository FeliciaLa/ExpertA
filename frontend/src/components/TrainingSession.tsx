import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { trainingService } from '../services/api';

interface Question {
  id: string;
  question: string;
  order: number;
}

export const TrainingSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      navigate('/training');
      return;
    }
    loadNextQuestion();
  }, [sessionId]);

  const loadNextQuestion = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError('');
      const response = await trainingService.getNextQuestion(sessionId);
      
      if ('message' in response) {
        // Session is completed
        setProgress(100);
        setTimeout(() => navigate('/training'), 2000);
        return;
      }

      setCurrentQuestion(response);
      setProgress((response.order - 1) * 5); // 5% per question (20 questions total)
    } catch (err) {
      setError('Failed to load question');
      console.error('Error loading question:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !currentQuestion || !answer.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      await trainingService.submitAnswer(sessionId, currentQuestion.id, answer.trim());
      setAnswer('');
      loadNextQuestion();
    } catch (err) {
      setError('Failed to submit answer');
      console.error('Error submitting answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
        <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 1 }}>
          Progress: {progress}%
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {currentQuestion ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Question {currentQuestion.order} of 20
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            {currentQuestion.question}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitting}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || submitting}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Answer'}
          </Button>
        </Paper>
      ) : (
        <Box textAlign="center">
          <Typography variant="h6" color="primary">
            Training Session Completed!
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Redirecting to training sessions...
          </Typography>
        </Box>
      )}
    </Box>
  );
}; 