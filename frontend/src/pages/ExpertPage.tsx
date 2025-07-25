import React from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import StepByStepOnboarding from '../components/StepByStepOnboarding';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert, user, refreshExpert } = useAuth();

  console.log('ExpertPage - expert data:', { email: expert?.email, onboarding_completed: expert?.onboarding_completed });
  console.log('ExpertPage - user data:', { email: user?.email, onboarding_completed: user?.onboarding_completed, role: user?.role });

  // For experts, prioritize expert data over user data to avoid inconsistencies
  const currentUser = expert || user;
  const showingOnboarding = !currentUser?.onboarding_completed;
  console.log(showingOnboarding ? 'ExpertPage - Showing StepByStepOnboarding' : 'ExpertPage - Showing ExpertProfile');



  return (
    <Container maxWidth="lg">
      {/* Show step-by-step onboarding if not completed, otherwise show regular profile */}
      {showingOnboarding ? (
        <StepByStepOnboarding />
      ) : (
        <ExpertProfile />
      )}
    </Container>
  );
};

export default ExpertPage; 