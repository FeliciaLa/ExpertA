import React, { useState, useEffect } from 'react';
import { Container, Paper, Box, Typography, Button, Divider } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import { SimpleExpertSetup } from '../components/SimpleExpertSetup';
import { ExpertWelcomeDialog } from '../components/ExpertWelcomeDialog';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
  const needsSetup = !expert?.onboarding_completed;

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
      console.log('Welcome dialog check:', { expertId: expert.id, hasSeenWelcome, showWelcomeDialog });
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

  // Temporary function to manually show welcome dialog for testing
  const showWelcomeManually = () => {
    setShowWelcomeDialog(true);
  };

  return (
    <Container maxWidth="lg">
      <ExpertProfile />
      
      {/* Temporary button for testing welcome dialog */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={showWelcomeManually}
          size="small"
        >
          Show Welcome Dialog (Test)
        </Button>
      </Box>
      
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