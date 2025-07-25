import React from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import StepByStepOnboarding from '../components/StepByStepOnboarding';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert, user } = useAuth();

  console.log('ExpertPage - expert data:', { email: expert?.email, onboarding_completed: expert?.onboarding_completed });
  console.log('ExpertPage - user data:', { email: user?.email, onboarding_completed: user?.onboarding_completed, role: user?.role });

  // For experts, prioritize expert data over user data to avoid inconsistencies
  const currentUser = expert || user;
  
  // Show onboarding until user has completed it AND navigated away
  const hasCompletedOnboardingFlow = localStorage.getItem('hasCompletedOnboardingFlow') === 'true';
  const showProfile = currentUser?.onboarding_completed && hasCompletedOnboardingFlow;
  
  return (
    <Container maxWidth="lg">
      {showProfile ? (
        <ExpertProfile />
      ) : (
        <StepByStepOnboarding />
      )}
    </Container>
  );
};

export default ExpertPage; 