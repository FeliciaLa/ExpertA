import React from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import StepByStepOnboarding from '../components/StepByStepOnboarding';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert, user, refreshExpert } = useAuth();

  console.log('ExpertPage - expert data:', { email: expert?.email, onboarding_completed: expert?.onboarding_completed });
  console.log('ExpertPage - user data:', { email: user?.email, onboarding_completed: user?.onboarding_completed, role: user?.role });

  // Use the unified user model instead of the legacy expert model
  const currentUser = user || expert;
  const showingOnboarding = !currentUser?.onboarding_completed;
  console.log(showingOnboarding ? 'ExpertPage - Showing StepByStepOnboarding' : 'ExpertPage - Showing ExpertProfile');

  // If we detect a potential state inconsistency (user just completed onboarding), 
  // force a profile refresh
  React.useEffect(() => {
    const handleFreshOnboarding = async () => {
      // Check if we just came from onboarding completion
      const justCompleted = localStorage.getItem('onboardingJustCompleted');
      if (justCompleted && refreshExpert) {
        console.log('Detected fresh onboarding completion, refreshing expert data...');
        localStorage.removeItem('onboardingJustCompleted');
        await refreshExpert();
      }
    };
    
    handleFreshOnboarding();
  }, [refreshExpert]);

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