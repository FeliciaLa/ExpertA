import React, { useState, useEffect } from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import { ExpertWelcomeDialog } from '../components/ExpertWelcomeDialog';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert } = useAuth();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

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

  return (
    <Container maxWidth="lg">
      <ExpertProfile />

      <ExpertWelcomeDialog
        open={showWelcomeDialog}
        onClose={handleWelcomeDialogClose}
        expertName={expert?.name}
      />
    </Container>
  );
};

export default ExpertPage; 