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
  
  // Show profile only if onboarding is completed AND user has been through the proper flow
  // This allows the congratulations screen and training navigation to happen first
  const hasCompletedOnboardingFlow = localStorage.getItem('hasCompletedOnboardingFlow') === 'true';
  const showProfile = currentUser?.onboarding_completed && hasCompletedOnboardingFlow;
  
  // Debug logging for profile display decision
  console.log('ExpertPage - Profile display decision:', {
    currentUser: currentUser?.email,
    onboarding_completed: currentUser?.onboarding_completed,
    hasCompletedOnboardingFlow,
    showProfile,
    localStorage_value: localStorage.getItem('hasCompletedOnboardingFlow')
  });
  
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