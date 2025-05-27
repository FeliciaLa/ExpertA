import React, { useState, useEffect } from 'react';
import { Container, Paper, Box, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpertProfile from '../components/ExpertProfile';
import { ExpertOnboarding } from '../components/ExpertOnboarding';
import OnboardingReview from '../components/OnboardingReview';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  const needsOnboarding = !expert?.onboarding_completed;
  const hasCompletedOnboarding = expert?.onboarding_completed;

  // Check for openProfileSetup flag in session storage on component mount
  useEffect(() => {
    const shouldOpenSetup = sessionStorage.getItem('openProfileSetup');
    if (shouldOpenSetup === 'true' && needsOnboarding) {
      setShowOnboarding(true);
      // Clear the flag
      sessionStorage.removeItem('openProfileSetup');
    }
  }, [needsOnboarding]);

  return (
    <Container maxWidth="lg">
      <ExpertProfile />
      
      {hasCompletedOnboarding && (
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
              Profile Setup
            </Typography>
          </Box>
        </Paper>
      )}
      
      {hasCompletedOnboarding && showReview && (
        <OnboardingReview />
      )}
      
      {needsOnboarding && !showOnboarding && (
        <Paper sx={{ p: 3, mt: 3, mb: 4 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Complete Your Expert Profile Setup
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" paragraph>
            To train your AI assistant effectively, we need more information about your expertise. 
            Please complete the profile setup questionnaire to provide details about your background, 
            methodologies, and specializations.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This step is required before you can begin AI training. The information you provide
            helps the AI understand your expertise better.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={() => setShowOnboarding(true)}
            >
              Start Profile Setup
            </Button>
          </Box>
        </Paper>
      )}

      {needsOnboarding && showOnboarding && (
        <Paper sx={{ p: 3, mt: 3, mb: 4 }}>
          <ExpertOnboarding onComplete={() => window.location.reload()} />
        </Paper>
      )}
    </Container>
  );
};

export default ExpertPage; 