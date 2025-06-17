import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  CircularProgress,
  Badge,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TestTubeIcon from '@mui/icons-material/Science';
import ShareIcon from '@mui/icons-material/Share';
import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface TrainingStats {
  documentsUploaded: number;
  qaMessagesCount: number;
  trainingMinutes: number;
}

interface AITrainingProgressProps {
  // Optional prop for future extensibility
}

export const AITrainingProgress: React.FC<AITrainingProgressProps> = () => {
  const { expert } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TrainingStats>({
    documentsUploaded: 0,
    qaMessagesCount: 0,
    trainingMinutes: 0
  });
  const [loading, setLoading] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    loadTrainingStats();
  }, [expert?.id]); // Only refresh when expert changes, not on every data update

  // Watch for increases in training message count to refresh stats
  useEffect(() => {
    const currentCount = expert?.total_training_messages || 0;
    if (currentCount > previousMessageCount && previousMessageCount > 0) {
      console.log('Training messages increased, refreshing stats:', {
        previous: previousMessageCount,
        current: currentCount
      });
      loadTrainingStats(true);
    }
    setPreviousMessageCount(currentCount);
  }, [expert?.total_training_messages, previousMessageCount]);

  const loadTrainingStats = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Get documents count
      const documentsResponse = await trainingService.getDocuments();
      const documentsCount = documentsResponse.documents?.length || 0;
      
      // Get accurate training stats from database
      const trainingStatsResponse = await trainingService.getTrainingStats();
      
      if (forceRefresh || trainingStatsResponse.stored_total !== trainingStatsResponse.updated_total) {
        console.log('Training stats from database:', {
          expertMessages: trainingStatsResponse.expert_messages,
          aiMessages: trainingStatsResponse.ai_messages,
          totalMessages: trainingStatsResponse.total_messages,
          trainingMinutes: trainingStatsResponse.training_minutes,
          storedTotal: trainingStatsResponse.stored_total,
          updatedTotal: trainingStatsResponse.updated_total,
          expertId: expert?.id,
          lastTraining: trainingStatsResponse.last_training_at
        });
      }
      
      setStats({
        documentsUploaded: documentsCount,
        qaMessagesCount: trainingStatsResponse.total_messages,
        trainingMinutes: trainingStatsResponse.training_minutes
      });
    } catch (error) {
      console.error('Error loading training stats:', error);
      
      // Fallback to expert data if API fails
      const qaMessages = expert?.total_training_messages || 0;
      const trainingMinutes = Math.max(Math.floor(qaMessages / 2), 0);
      
      setStats({
        documentsUploaded: 0,
        qaMessagesCount: qaMessages,
        trainingMinutes: trainingMinutes
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh stats manually (useful after training sessions)
  const refreshStats = () => {
    loadTrainingStats(true);
  };

  const getAIPersonality = () => {
    const totalProgress = stats.documentsUploaded + Math.floor(stats.qaMessagesCount / 10);
    
    if (totalProgress === 0) {
      return {
        status: 'dormant',
        message: "I'm ready to learn! Start training me with your expertise.",
        avatar: '😴',
        color: '#9e9e9e'
      };
    } else if (totalProgress < 5) {
      return {
        status: 'learning',
        message: "I'm just getting started! Keep teaching me more.",
        avatar: '🤖',
        color: '#2196f3'
      };
    } else if (totalProgress < 15) {
      return {
        status: 'growing',
        message: "I'm learning fast! I can already help with basic questions.",
        avatar: '🧠',
        color: '#ff9800'
      };
    } else {
      return {
        status: 'expert',
        message: "I'm becoming quite knowledgeable! Ready to represent your expertise.",
        avatar: '🎓',
        color: '#4caf50'
      };
    }
  };

  const aiPersonality = getAIPersonality();

  const handleTestAI = () => {
    if (expert?.slug) {
      navigate(`/experts/${expert.slug}`);
    } else if (expert?.id) {
      // Fallback to ID if slug is not available
      navigate(`/experts/${expert.id}`);
    }
  };

  const handleShareAI = async () => {
    if (!expert) return;
    
    // Construct the clean URL using slug or fallback to ID
    const expertUrl = expert.slug 
      ? `${window.location.origin}/experts/${expert.slug}`
      : `${window.location.origin}/experts/${expert.id}`;
    
    try {
      // Try to use the modern clipboard API
      await navigator.clipboard.writeText(expertUrl);
      setShareSuccess(true);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = expertUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setShareSuccess(true);
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setShareSuccess(false);
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="center">
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography>Loading training progress...</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
      <Grid container spacing={2} alignItems="center">
        {/* AI Avatar and Status */}
        <Grid item xs={12} md={3}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
            <Badge
              badgeContent={aiPersonality.status === 'expert' ? <CheckCircleIcon sx={{ fontSize: 12 }} /> : ''}
              color="success"
              overlap="circular"
            >
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: aiPersonality.color,
                  fontSize: '1.5rem',
                  mb: 1,
                  border: `2px solid ${aiPersonality.color}20`,
                  animation: stats.qaMessagesCount > 0 ? 'pulse 2s infinite' : 'none'
                }}
              >
                {aiPersonality.avatar}
              </Avatar>
            </Badge>
            
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
              {expert?.name ? `${expert.name}'s AI` : 'Your AI'}
            </Typography>
          </Box>
        </Grid>

        {/* Progress Stats */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <UploadFileIcon color="primary" sx={{ fontSize: 24 }} />
                <Typography variant="h6" color="primary" fontWeight="bold" sx={{ lineHeight: 1 }}>
                  {stats.documentsUploaded}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Documents
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <ChatIcon color="primary" sx={{ fontSize: 24 }} />
                <Typography variant="h6" color="primary" fontWeight="bold" sx={{ lineHeight: 1 }}>
                  {stats.trainingMinutes}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Q&A Minutes
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>

        {/* AI Message and Test Button */}
        <Grid item xs={12} md={3}>
          <Box textAlign="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={handleShareAI}
              sx={{ 
                mb: 1,
                color: 'primary.main',
                borderColor: 'primary.main',
                '&:hover': { 
                  bgcolor: 'primary.light',
                  borderColor: 'primary.dark' 
                }
              }}
            >
              Share your AI
            </Button>
            
            <Button
              variant="contained"
              size="small"
              startIcon={<TestTubeIcon />}
              onClick={handleTestAI}
              sx={{ 
                bgcolor: 'secondary.main',
                '&:hover': { bgcolor: 'secondary.dark' }
              }}
            >
              Test Your AI
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Success notification for sharing */}
      <Snackbar
        open={shareSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          AI link copied to clipboard! Share it with anyone to let them chat with your AI.
        </Alert>
      </Snackbar>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </Paper>
  );
}; 