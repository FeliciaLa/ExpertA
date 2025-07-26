import React, { Suspense, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { CircularProgress, Box } from '@mui/material';
import { features } from './utils/environment';

// Pages and components
import LandingPage from './pages/LandingPage';
import ExpertList from './components/ExpertList';
import ExpertDetailPage from './components/ExpertDetailPage';
import ExpertPage from './pages/ExpertPage';
import UserProfilePage from './pages/UserProfilePage';
import { TrainingChat } from './components/TrainingChat';
import { ExpertOnboarding } from './components/ExpertOnboarding';
import ExpertProfile from './components/ExpertProfile';
import OnboardingReview from './components/OnboardingReview';
import DocumentUpload from './components/DocumentUpload';
import ExpertActivationPage from './components/ExpertActivationPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import TrainingPage from './pages/TrainingPage';
import PasswordResetPage from './pages/PasswordResetPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Contact from './pages/Contact';

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Protected route component that checks auth
const ProtectedExpertRoute = ({ children }: { children: ReactNode }) => {
  const { isExpert, isAuthenticated, isLoading, user, expert } = useAuth();
  const location = useLocation();

  console.log('ProtectedExpertRoute check:', { 
    isExpert, 
    isAuthenticated, 
    isLoading, 
    pathname: location.pathname,
    userRole: user?.role,
    expertExists: !!expert,
    userExists: !!user,
    userEmail: user?.email,
    expertEmail: expert?.email
  });

  // While checking authentication, show loading
  if (isLoading) {
    console.log('ProtectedExpertRoute: Showing loading because isLoading=true');
    return <LoadingFallback />;
  }
  
  if (!isExpert) {
    console.log('ProtectedExpertRoute: Redirecting to / because isExpert is false', {
      isExpert,
      isAuthenticated,
      userRole: user?.role,
      fullAuthState: { user, expert, isExpert, isAuthenticated }
    });
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  console.log('ProtectedExpertRoute: Access granted - showing children');
  return <>{children}</>;
};

// Protected route component for users
const ProtectedUserRoute = ({ children }: { children: ReactNode }) => {
  const { isUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('ProtectedUserRoute check:', { isUser, isAuthenticated, isLoading, pathname: location.pathname });

  // While checking authentication, show loading
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  if (!isUser) {
    console.log('ProtectedUserRoute: Redirecting to / because isUser is false');
  }
  
  return isUser ? <>{children}</> : <Navigate to="/" state={{ from: location }} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      {/* Browse Experts functionality - conditionally enabled */}
      {features.browseExperts ? (
        <Route path="/experts" element={<Layout><ExpertList /></Layout>} />
      ) : (
        <Route path="/experts" element={<Navigate to="/" replace />} />
      )}
      <Route path="/experts/:expertId" element={<Layout><ExpertDetailPage /></Layout>} />
      <Route path="/verify-email/:token" element={<Layout><VerifyEmailPage /></Layout>} />
      <Route path="/verify-email-change/:token" element={<Layout><EmailVerificationPage /></Layout>} />
      <Route path="/reset-password/:uidb64/:token" element={<Layout><PasswordResetPage /></Layout>} />
      <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
      <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      
      {/* Expert routes */}
      <Route path="/expert-activation" element={
        <ProtectedExpertRoute>
          <Layout>
            <ExpertActivationPage />
          </Layout>
        </ProtectedExpertRoute>
      } />
      <Route path="/expert/profile" element={
        <ProtectedExpertRoute>
          <Layout>
            <ExpertProfile />
          </Layout>
        </ProtectedExpertRoute>
      } />
      <Route path="/expert/*" element={
        <ProtectedExpertRoute>
          <Layout>
            <ExpertPage />
          </Layout>
        </ProtectedExpertRoute>
      } />
      <Route path="/train" element={
        <ProtectedExpertRoute>
          <Layout>
            <TrainingPage />
          </Layout>
        </ProtectedExpertRoute>
      } />
      
      {/* User routes */}
      <Route path="/user/profile" element={
        <ProtectedUserRoute>
          <Layout>
            <UserProfilePage />
          </Layout>
        </ProtectedUserRoute>
      } />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes; 