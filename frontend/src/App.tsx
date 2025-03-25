import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import { ExpertForm } from './components/ExpertForm';
import ExpertList from './components/ExpertList';
import { useAuth } from './contexts/AuthContext';
import ExpertDetailPage from './components/ExpertDetailPage';
import { TrainingSessionList } from './components/TrainingSessionList';
import { TrainingSession } from './components/TrainingSession';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/experts" element={<ExpertList />} />
            <Route path="/experts/:expertId" element={<ExpertDetailPage />} />
            <Route
              path="/expert"
              element={isAuthenticated ? <ExpertForm /> : <Navigate to="/" />}
            />
            <Route
              path="/training"
              element={isAuthenticated ? <TrainingSessionList /> : <Navigate to="/" />}
            />
            <Route
              path="/training/:sessionId"
              element={isAuthenticated ? <TrainingSession /> : <Navigate to="/" />}
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
