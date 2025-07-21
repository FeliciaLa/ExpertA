import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Button } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated, setIsUser, setIsExpert } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`verify-email/${token}/`);
        
        // Save user data and tokens
        localStorage.setItem('tokens', JSON.stringify(response.data.tokens));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Determine role and set appropriate auth role
        const userRole = response.data.user.role || 'user';
        localStorage.setItem('auth_role', userRole);
        setUserRole(userRole);
        
        // Set API authorization header for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.access}`;
        
        // Update auth context based on role
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        if (userRole === 'expert') {
          setIsExpert(true);
          setIsUser(false);
        } else {
          setIsExpert(false);
          setIsUser(true);
        }
        
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
  }, [token, setUser, setIsAuthenticated, setIsUser, setIsExpert]);

  // Auto-redirect users to The Stoic Mentor after successful verification
  useEffect(() => {
    if (isVerified && userRole === 'user') {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate('/experts/the-stoic-mentor');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isVerified, userRole, navigate]);

  const handleGoToHome = () => {
    // Navigate based on user role after verification
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role === 'expert') {
        navigate('/expert');
      } else {
        // Redirect users directly to The Stoic Mentor
        navigate('/experts/the-stoic-mentor');
      }
    } else {
      // Fallback to The Stoic Mentor page
      navigate('/experts/the-stoic-mentor');
    }
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
              {userRole === 'expert' 
                ? 'Your email has been successfully verified! Now let\'s set up your expert profile to get started.'
                : `Your email has been successfully verified! Redirecting to The Stoic Mentor in ${countdown} second${countdown !== 1 ? 's' : ''}...`
              }
            </Typography>
            <Button variant="contained" color="primary" onClick={handleGoToHome}>
              {userRole === 'expert' ? 'Set Up Profile' : 'Chat with The Stoic Mentor'}
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