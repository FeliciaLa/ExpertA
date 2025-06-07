import React, { Suspense, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { CircularProgress, Box } from '@mui/material';

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
import VerifyEmailPage from './pages/VerifyEmailPage';
import TrainingPage from './pages/TrainingPage';
import PasswordResetPage from './pages/PasswordResetPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Protected route component that checks auth
const ProtectedExpertRoute = ({ children }: { children: ReactNode }) => {
  const { isExpert, isAuthenticated } = useAuth();
  const location = useLocation();

  // While checking authentication, show loading
  if (isAuthenticated === null) {
    return <LoadingFallback />;
  }
  
  return isExpert ? <>{children}</> : <Navigate to="/" state={{ from: location }} replace />;
};

// Protected route component for users
const ProtectedUserRoute = ({ children }: { children: ReactNode }) => {
  const { isUser, isAuthenticated } = useAuth();
  const location = useLocation();

  // While checking authentication, show loading
  if (isAuthenticated === null) {
    return <LoadingFallback />;
  }
  
  return isUser ? <>{children}</> : <Navigate to="/" state={{ from: location }} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/experts" element={<Layout><ExpertList /></Layout>} />
      <Route path="/experts/:expertId" element={<Layout><ExpertDetailPage /></Layout>} />
      <Route path="/verify-email/:token" element={<Layout><VerifyEmailPage /></Layout>} />
      <Route path="/reset-password/:uidb64/:token" element={<Layout><PasswordResetPage /></Layout>} />
      <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
      <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
      
      {/* Expert routes */}
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