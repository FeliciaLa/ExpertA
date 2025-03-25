import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import { ExpertForm } from './components/ExpertForm';
import ExpertList from './components/ExpertList';
import { useAuth } from './contexts/AuthContext';
import ExpertDetailPage from './components/ExpertDetailPage';

function App() {
  // Move ProtectedRoute inside App
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/" />;
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route 
              path="/expert" 
              element={
                <ProtectedRoute>
                  <ExpertForm />
                </ProtectedRoute>
              } 
            />
            <Route path="/experts" element={<ExpertList />} />
            <Route path="/experts/:expertId" element={<ExpertDetailPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
