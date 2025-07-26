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
  
  // Simple logic: if onboarding is completed, show profile. Otherwise show onboarding.
  // This is the single source of truth from the database.
  const showProfile = currentUser?.onboarding_completed === true;
  
  // Debug logging for profile display decision
  console.log('ExpertPage - Profile display decision:', {
    currentUser: currentUser?.email,
    onboarding_completed: currentUser?.onboarding_completed,
    showProfile
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