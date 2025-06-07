import React, { useState, useEffect } from 'react';
import { Container, Paper, Box, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpertProfile from '../components/ExpertProfile';
import { SimpleExpertSetup } from '../components/SimpleExpertSetup';
import OnboardingReview from '../components/OnboardingReview';
import { ExpertWelcomeDialog } from '../components/ExpertWelcomeDialog';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
  const needsSetup = !expert?.onboarding_completed;
  const hasCompletedSetup = expert?.onboarding_completed;

  // Check for openProfileSetup flag in session storage on component mount
  useEffect(() => {
    const shouldOpenSetup = sessionStorage.getItem('openProfileSetup');
    if (shouldOpenSetup === 'true' && needsSetup) {
      setShowSetup(true);
      // Clear the flag
      sessionStorage.removeItem('openProfileSetup');
    }
  }, [needsSetup]);

  // Check if we should show the welcome dialog for new experts
  useEffect(() => {
    if (expert?.id) {
      const hasSeenWelcome = localStorage.getItem(`expert_welcome_seen_${expert.id}`);
      if (!hasSeenWelcome) {
        setShowWelcomeDialog(true);
      }
    }
  }, [expert?.id]);

  const handleWelcomeDialogClose = () => {
    setShowWelcomeDialog(false);
    if (expert?.id) {
      localStorage.setItem(`expert_welcome_seen_${expert.id}`, 'true');
    }
  };

  return (
    <Container maxWidth="lg">
      <ExpertProfile />
      
      {hasCompletedSetup && (
        <Paper 
          sx={{ 
            p: 2, 
            mt: 3, 
            mb: showReview ? 0 : 4, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            bgcolor: 'primary.light',
            color: 'white'
          }}
          onClick={() => setShowReview(!showReview)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              Expert Profile Complete
            </Typography>
          </Box>
        </Paper>
      )}
      
      {hasCompletedSetup && showReview && (
        <OnboardingReview />
      )}
      
      {needsSetup && !showSetup && (
        <Paper sx={{ p: 3, mt: 3, mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Complete Your Expert Profile
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" paragraph>
            To start training your AI assistant, we need to understand your expertise. 
            Complete your profile with information about your background, skills, and experience.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This takes just a few minutes and helps the AI learn your unique perspective and knowledge.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={() => setShowSetup(true)}
            >
              Complete Profile
            </Button>
          </Box>
        </Paper>
      )}

      {needsSetup && showSetup && (
        <Box sx={{ mt: 3, mb: 4 }}>
          <SimpleExpertSetup onComplete={() => window.location.reload()} />
        </Box>
      )}

      <ExpertWelcomeDialog
        open={showWelcomeDialog}
        onClose={handleWelcomeDialogClose}
        expertName={expert?.name}
      />
    </Container>
  );
};

export default ExpertPage; 