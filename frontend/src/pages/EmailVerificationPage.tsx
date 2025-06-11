import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../services/api';

export const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const verifyEmailChange = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link - no token provided');
        return;
      }

      try {
        console.log('Verifying email change with token:', token);
        console.log('API URL:', API_URL);
        console.log('Full verification URL:', `${API_URL}verify-email-change/`);
        
        const response = await fetch(`${API_URL}verify-email-change/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const data = await response.json();
        console.log('Email verification response:', data);

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email successfully updated!');
          setNewEmail(data.new_email || '');
          
          // Refresh user data to show updated email in UI
          if (refreshUser) {
            await refreshUser();
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email change');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email change. Please try again or contact support.');
      }
    };

    verifyEmailChange();
  }, [token, refreshUser]);

  const handleGoToProfile = () => {
    navigate('/expert/profile');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {status === 'loading' && (
          <Box>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              Verifying Email Change
            </Typography>
            <Typography color="textSecondary">
              Please wait while we verify your new email address...
            </Typography>
          </Box>
        )}

        {status === 'success' && (
          <Box>
            <CheckCircleIcon 
              sx={{ fontSize: 80, color: 'success.main', mb: 2 }} 
            />
            <Typography variant="h4" gutterBottom color="success.main">
              Email Verified Successfully!
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              {message}
            </Alert>
            {newEmail && (
              <Typography variant="body1" sx={{ mb: 3 }}>
                Your email has been changed to: <strong>{newEmail}</strong>
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={handleGoToProfile}
                size="large"
              >
                Go to Profile
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleGoHome}
                size="large"
              >
                Go to Home
              </Button>
            </Box>
          </Box>
        )}

        {status === 'error' && (
          <Box>
            <ErrorIcon 
              sx={{ fontSize: 80, color: 'error.main', mb: 2 }} 
            />
            <Typography variant="h4" gutterBottom color="error.main">
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {message}
            </Alert>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Common reasons for failure:
              <br />• The verification link has expired (links expire after 24 hours)
              <br />• The link has already been used
              <br />• The email address is no longer available
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={handleGoToProfile}
                size="large"
              >
                Go to Profile
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleGoHome}
                size="large"
              >
                Go to Home
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EmailVerificationPage; 