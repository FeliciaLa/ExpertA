import React from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import StepByStepOnboarding from '../components/StepByStepOnboarding';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert } = useAuth();

  return (
    <Container maxWidth="lg">
      {/* Show step-by-step onboarding if not completed, otherwise show regular profile */}
      {!expert?.onboarding_completed ? (
        <StepByStepOnboarding />
      ) : (
        <ExpertProfile />
      )}
    </Container>
  );
};

export default ExpertPage; 