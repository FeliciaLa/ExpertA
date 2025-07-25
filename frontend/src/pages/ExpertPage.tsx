import React, { useState, useEffect } from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import StepByStepOnboarding from '../components/StepByStepOnboarding';
import { useAuth } from '../contexts/AuthContext';

const ExpertPage: React.FC = () => {
  const { expert, user, refreshExpert } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  console.log('ExpertPage - expert data:', { email: expert?.email, onboarding_completed: expert?.onboarding_completed });
  console.log('ExpertPage - user data:', { email: user?.email, onboarding_completed: user?.onboarding_completed, role: user?.role });

  // For experts, prioritize expert data over user data to avoid inconsistencies
  const currentUser = expert || user;
  
  // Check if user has seen the completion screen
  useEffect(() => {
    const hasSeenCompletion = localStorage.getItem('onboardingCompletionSeen');
    if (currentUser?.onboarding_completed && hasSeenCompletion === 'true') {
      setShowProfile(true);
    }
  }, [currentUser?.onboarding_completed]);

  // Listen for completion screen being shown
  useEffect(() => {
    const handleCompletionSeen = () => {
      localStorage.setItem('onboardingCompletionSeen', 'true');
      setShowProfile(true);
    };

    window.addEventListener('onboardingCompletionSeen', handleCompletionSeen);
    return () => window.removeEventListener('onboardingCompletionSeen', handleCompletionSeen);
  }, []);

  console.log(showProfile ? 'ExpertPage - Showing ExpertProfile' : 'ExpertPage - Showing StepByStepOnboarding');

  return (
    <Container maxWidth="lg">
      {/* Always show StepByStepOnboarding first to handle completion screen, then profile */}
      {showProfile ? (
        <ExpertProfile />
      ) : (
        <StepByStepOnboarding />
      )}
    </Container>
  );
};

export default ExpertPage; 