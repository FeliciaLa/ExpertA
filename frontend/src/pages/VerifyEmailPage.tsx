import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Button } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated, setIsUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`verify-email/${token}/`);
        
        // Save user data and tokens
        localStorage.setItem('tokens', JSON.stringify(response.data.tokens));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('auth_role', 'user');
        
        // Update auth context
        setUser(response.data.user);
        setIsAuthenticated(true);
        setIsUser(true);
        
        setIsVerified(true);
      } catch (error: any) {
        console.error('Email verification error:', error);
        setError(error.response?.data?.error || 'Verification failed');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setError('Invalid verification token');
      setIsLoading(false);
    }
  }, [token, setUser, setIsAuthenticated, setIsUser]);

  const handleGoToHome = () => {
    // Navigate to the experts page after verification
    navigate('/experts');
  };

  const handleGoToLogin = () => {
    navigate('/');
    // TODO: Open the login dialog
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Verifying your email...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {isVerified ? (
          <Box display="flex" flexDirection="column" alignItems="center">
            <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Email Verified!
            </Typography>
            <Typography variant="body1" paragraph>
              Your email has been successfully verified and your account is now active.
            </Typography>
            <Button variant="contained" color="primary" onClick={handleGoToHome}>
              Browse Experts
            </Button>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center">
            <Error color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Verification Failed
            </Typography>
            <Typography variant="body1" paragraph>
              {error || 'There was a problem verifying your email.'}
            </Typography>
            <Box display="flex" gap={2}>
              <Button variant="contained" color="primary" onClick={handleGoToLogin}>
                Go to Login
              </Button>
              <Button variant="outlined" onClick={handleGoToHome}>
                Back to Home
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default VerifyEmailPage; 