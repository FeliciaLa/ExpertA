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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Modal
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TestTubeIcon from '@mui/icons-material/Science';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { trainingService } from '../services/api';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import ExpertActivationPayment from './ExpertSubscriptionPayment';
import AITestPreview from './AITestPreview';

interface TrainingStats {
  documentsUploaded: number;
  qaMessagesCount: number;
  trainingMessages: number;
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
    trainingMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showActivationPayment, setShowActivationPayment] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showTestPreview, setShowTestPreview] = useState(false);
  const [interactionStats, setInteractionStats] = useState({
    used: 0,
    total: 200,
    percentage: 0
  });

  const checkActivationStatus = async () => {
    try {
      // Check if expert has any consultation sessions with ACTIVATION marker
      const response = await api.get(`/user/profile/direct/${expert?.id}/`);
      const consultations = response.data.consultations?.sessions || [];
      
      // Look for activation payment session (just to check if activated)
      const activationSession = consultations.find((session: any) => 
        session.expert_industry === 'ACTIVATION'
      );
      
      const hasActivation = !!activationSession;
      setIsActivated(hasActivation);
      
      // If activated, calculate user interaction usage from ALL consultation sessions
      if (hasActivation) {
        // Sum up total_messages from all consultation sessions (excluding the activation payment session)
        const userConsultationSessions = consultations.filter((session: any) => 
          session.expert_industry !== 'ACTIVATION'  // Exclude the activation payment record
        );
        
        const totalUserMessages = userConsultationSessions.reduce((sum: number, session: any) => {
          return sum + (session.total_messages || 0);
        }, 0);
        
        const interactionsUsed = Math.floor(totalUserMessages / 2); // 2 messages per interaction
        const percentage = Math.min((interactionsUsed / 200) * 100, 100);
        
        setInteractionStats({
          used: interactionsUsed,
          total: 200,
          percentage: percentage
        });
        
        console.log('Expert activation status:', hasActivation);
        console.log('User consultation sessions:', userConsultationSessions.length);
        console.log('Total user messages:', totalUserMessages);
        console.log('User interactions used:', interactionsUsed, '/200');
      } else {
        console.log('Expert activation status:', hasActivation, 'from', consultations.length, 'sessions');
      }
    } catch (error) {
      console.error('Failed to check activation status:', error);
      // Default to not activated if check fails
      setIsActivated(false);
    }
  };

  useEffect(() => {
    loadTrainingStats();
  }, [expert?.id]); // Only refresh when expert changes, not on every data update

  // Check activation status when expert changes
  useEffect(() => {
    if (expert?.id) {
      checkActivationStatus();
    }
  }, [expert?.id]);

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
        trainingMessages: trainingStatsResponse.training_minutes
      });
    } catch (error) {
      console.error('Error loading training stats:', error);
      
      // Fallback to expert data if API fails
      const qaMessages = expert?.total_training_messages || 0;
      const trainingMinutes = Math.max(Math.floor(qaMessages / 2), 0);
      
      setStats({
        documentsUploaded: 0,
        qaMessagesCount: qaMessages,
        trainingMessages: trainingMinutes
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
    setShowTestPreview(true);
  };

  const handleShareAI = () => {
    if (isActivated) {
      // Expert is activated, toggle share modal
      setShareModalOpen(prev => !prev);
    } else {
      // Expert not activated, toggle activation payment modal
      setShowActivationPayment(prev => !prev);
    }
  };

  const getShareUrl = () => {
    if (!expert) return '';
    return expert.slug 
      ? `${window.location.origin}/experts/${expert.slug}`
      : `${window.location.origin}/experts/${expert.id}`;
  };

  const handleCopyUrl = async () => {
    const expertUrl = getShareUrl();
    
    try {
      // Try to use the modern clipboard API
      await navigator.clipboard.writeText(expertUrl);
      setShareSuccess(true);
      setShareModalOpen(false);
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
        setShareModalOpen(false);
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

  const handleCloseModal = () => {
    setShareModalOpen(false);
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
                  {stats.trainingMessages}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Q&A Messages
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12} md={3}>
          <Box textAlign="center" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Primary Revenue Button - Prominent but Clean */}
            <Button
              variant="contained"
              size="large"
              startIcon={<ShareIcon />}
              onClick={handleShareAI}
              sx={{ 
                minWidth: '180px',
                py: 1.5,
                px: 3,
                fontSize: '1rem',
                fontWeight: '600',
                bgcolor: isActivated ? 'success.main' : 'warning.main',
                '&:hover': { 
                  bgcolor: isActivated ? 'success.dark' : 'warning.dark',
                },
                textTransform: 'none'
              }}
            >
              {isActivated ? 'Share your AI' : 'Activate & Share'}
            </Button>
            
            {/* Secondary Test Button - Smaller */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<TestTubeIcon />}
              onClick={handleTestAI}
              sx={{ 
                minWidth: '140px',
                py: 0.75,
                fontSize: '0.875rem',
                color: 'secondary.main',
                borderColor: 'secondary.main',
                '&:hover': { 
                  bgcolor: 'secondary.light',
                  borderColor: 'secondary.dark'
                },
                textTransform: 'none'
              }}
            >
              Test Your AI
            </Button>
          </Box>
        </Grid>

        {/* Compact Interaction Counter - Only shown for activated experts */}
        {isActivated && (
          <Grid item xs={12}>
            <Box sx={{ 
              p: 1.5, 
              border: '1px solid', 
              borderColor: interactionStats.percentage > 80 ? 'warning.main' : 'grey.300',
              borderRadius: 1,
              bgcolor: interactionStats.percentage > 80 ? 'warning.light' : 'grey.50',
              alpha: 0.05,
              mb: 1
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  👥 Public User Interactions
                </Typography>
                <Typography variant="caption" fontWeight="bold" 
                  color={interactionStats.percentage > 80 ? 'warning.main' : 'text.secondary'}
                  sx={{ fontSize: '0.75rem' }}
                >
                  {interactionStats.used}/200
                </Typography>
              </Box>
              
              <Box sx={{ mt: 0.5 }}>
                <Box
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'grey.200',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${interactionStats.percentage}%`,
                      bgcolor: interactionStats.percentage > 80 ? 'warning.main' : 'success.main',
                      transition: 'width 0.3s ease-in-out'
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Share Modal */}
      <Dialog 
        open={shareModalOpen} 
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Share Your AI
          </Typography>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Share this link with anyone to let them interact with your AI assistant. They'll be able to ask questions and get responses based on your expertise and training.
          </Typography>
          
          <TextField
            fullWidth
            label="Your AI Link"
            value={getShareUrl()}
            variant="outlined"
            sx={{ mb: 2 }}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopyUrl} edge="end">
                  <ContentCopyIcon />
                </IconButton>
              ),
            }}
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="textSecondary">
            <strong>Pro tip:</strong> This is your clean, shareable URL that you can post on social media, include in your email signature, or share in professional networks.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseModal} color="secondary">
            Close
          </Button>
          <Button 
            onClick={handleCopyUrl} 
            variant="contained" 
            startIcon={<ContentCopyIcon />}
            color="primary"
          >
            Copy Link
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Activation Payment Modal */}
      {showActivationPayment && (
        <ExpertActivationPayment
          onPaymentSuccess={() => {
            setShowActivationPayment(false);
            setIsActivated(true);
            // Show success and then open share modal
            setTimeout(() => {
              setShareModalOpen(true);
            }, 500);
          }}
          onClose={() => setShowActivationPayment(false)}
        />
      )}

      {/* AI Test Preview Modal */}
      {showTestPreview && (
        <AITestPreview
          open={showTestPreview}
          onClose={() => setShowTestPreview(false)}
        />
      )}

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