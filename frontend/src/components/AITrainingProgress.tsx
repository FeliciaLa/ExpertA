import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Badge
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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

  const getNextSteps = () => {
    const steps = [];
    
    if (stats.documentsUploaded === 0) {
      steps.push({
        icon: <UploadFileIcon />,
        title: 'Upload Your First Document',
        description: 'Share PDFs, Word docs, or other files with your knowledge',
        priority: 'high'
      });
    } else if (stats.documentsUploaded < 3) {
      steps.push({
        icon: <UploadFileIcon />,
        title: 'Upload More Documents',
        description: `You have ${stats.documentsUploaded} document${stats.documentsUploaded === 1 ? '' : 's'}. Add more for better AI training.`,
        priority: 'medium'
      });
    }
    
    if (stats.qaMessagesCount === 0) {
      steps.push({
        icon: <ChatIcon />,
        title: 'Start Q&A Training',
        description: 'Have a conversation with your AI to teach it your thought process',
        priority: 'high'
      });
    } else if (stats.trainingMinutes < 10) {
      steps.push({
        icon: <ChatIcon />,
        title: 'Continue Q&A Training',
        description: `${stats.trainingMinutes} minutes completed. Aim for at least 10-15 minutes.`,
        priority: 'medium'
      });
    }
    
    if (steps.length === 0) {
      steps.push({
        icon: <TrendingUpIcon />,
        title: 'Keep Improving',
        description: 'Great job! Continue adding content to make your AI even smarter.',
        priority: 'low'
      });
    }
    
    return steps;
  };

  const aiPersonality = getAIPersonality();
  const nextSteps = getNextSteps();
  const overallProgress = Math.min(100, ((stats.documentsUploaded * 10) + stats.trainingMinutes) * 2);

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
    <Paper sx={{ p: 4, mb: 4, bgcolor: 'background.paper' }}>
      <Grid container spacing={3}>
        {/* AI Avatar and Status */}
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
            <Badge
              badgeContent={aiPersonality.status === 'expert' ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : ''}
              color="success"
              overlap="circular"
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: aiPersonality.color,
                  fontSize: '2rem',
                  mb: 2,
                  border: `3px solid ${aiPersonality.color}20`,
                  animation: stats.qaMessagesCount > 0 ? 'pulse 2s infinite' : 'none'
                }}
              >
                {aiPersonality.avatar}
              </Avatar>
            </Badge>
            
            <Typography variant="h6" gutterBottom color="primary">
              Your AI Assistant
            </Typography>
            
            <Chip
              label={aiPersonality.status.toUpperCase()}
              sx={{
                bgcolor: aiPersonality.color,
                color: 'white',
                fontWeight: 'bold',
                mb: 2
              }}
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              "{aiPersonality.message}"
            </Typography>
          </Box>
        </Grid>

        {/* Progress Stats */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
            Training Progress
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="textSecondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {overallProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4
                }
              }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                <UploadFileIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {stats.documentsUploaded}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Documents Uploaded
                </Typography>
              </Card>
            </Grid>
            
            <Grid item xs={6}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                <ChatIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {stats.trainingMinutes}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Minutes of Q&A Training
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {stats.lastTrainingDate && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
              Last training session: {new Date(stats.lastTrainingDate).toLocaleDateString()} at {new Date(stats.lastTrainingDate).toLocaleTimeString()}
            </Typography>
          )}
        </Grid>

        {/* Next Steps */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Next Steps
          </Typography>
          
          <Grid container spacing={2}>
            {nextSteps.map((step, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: step.priority === 'high' ? 'warning.main' : 'divider',
                    borderWidth: step.priority === 'high' ? 2 : 1
                  }}
                >
                  <CardContent sx={{ p: '16px !important' }}>
                    <Box display="flex" alignItems="flex-start">
                      <Box sx={{ color: 'primary.main', mr: 2, mt: 0.5 }}>
                        {step.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {step.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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