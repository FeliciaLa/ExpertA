import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  Grid,
  CircularProgress,
  Badge
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';

interface TrainingStats {
  documentsUploaded: number;
  qaMessagesCount: number;
  trainingMinutes: number;
  lastTrainingDate?: string;
}

interface AITrainingProgressProps {
  // Optional prop for future extensibility
}

export const AITrainingProgress: React.FC<AITrainingProgressProps> = () => {
  const { expert } = useAuth();
  const [stats, setStats] = useState<TrainingStats>({
    documentsUploaded: 0,
    qaMessagesCount: 0,
    trainingMinutes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainingStats();
  }, [expert?.total_training_messages]); // Refresh when expert data changes

  const loadTrainingStats = async () => {
    try {
      setLoading(true);
      
      // Get documents count
      const documentsResponse = await trainingService.getDocuments();
      const documentsCount = documentsResponse.documents?.length || 0;
      
      // Calculate Q&A stats from expert data
      const qaMessages = expert?.total_training_messages || 0;
      const trainingMinutes = Math.floor(qaMessages / 2); // Estimate 2 messages per minute
      
      setStats({
        documentsUploaded: documentsCount,
        qaMessagesCount: qaMessages,
        trainingMinutes: trainingMinutes,
        lastTrainingDate: expert?.last_training_at
      });
    } catch (error) {
      console.error('Error loading training stats:', error);
    } finally {
      setLoading(false);
    }
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
              Your AI Assistant
            </Typography>
            
            <Chip
              label={aiPersonality.status.toUpperCase()}
              size="small"
              sx={{
                bgcolor: aiPersonality.color,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: 20
              }}
            />
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

        {/* AI Message */}
        <Grid item xs={12} md={3}>
          <Box textAlign="center">
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
              "{aiPersonality.message}"
            </Typography>
            {stats.lastTrainingDate && (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                Last: {new Date(stats.lastTrainingDate).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>

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