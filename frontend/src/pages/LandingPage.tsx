import React, { useState } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SignInDialog from '../components/SignInDialog';
import RegisterDialog from '../components/RegisterDialog';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, register, isAuthenticated } = useAuth();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const handleExpertClick = () => {
    if (isAuthenticated) {
      navigate('/expert');
    } else {
      setIsSignInOpen(true);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      navigate('/expert');
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      await register(name, email, password);
      setIsRegisterOpen(false);
      navigate('/expert');
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  const switchToRegister = () => {
    setIsSignInOpen(false);
    setIsRegisterOpen(true);
  };

  const switchToSignIn = () => {
    setIsRegisterOpen(false);
    setIsSignInOpen(true);
  };

  return (
    <>
      <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper 
          elevation={3} 
          sx={{
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            maxWidth: 600,
            width: '100%',
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom textAlign="center">
            Welcome to ExpertA
          </Typography>
          
          <Typography variant="h6" component="h2" gutterBottom textAlign="center" color="text.secondary">
            Choose your experience
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, width: '100%', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleExpertClick}
                sx={{ 
                  minWidth: 200,
                  py: 2,
                  backgroundColor: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.dark' }
                }}
              >
                Expert Sign In
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={() => setIsRegisterOpen(true)}
                sx={{ 
                  minWidth: 200,
                  py: 2,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': { 
                    borderColor: 'primary.dark',
                    backgroundColor: 'primary.light' 
                  }
                }}
              >
                Register as Expert
              </Button>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              - or -
            </Typography>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/experts')}
              sx={{ 
                minWidth: 200,
                py: 2,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': { 
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.light' 
                }
              }}
            >
              Browse as User
            </Button>
          </Box>
        </Paper>
      </Container>

      <SignInDialog
        open={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignIn={handleSignIn}
        onRegisterClick={switchToRegister}
      />

      <RegisterDialog
        open={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegister={handleRegister}
        onSignInClick={switchToSignIn}
      />
    </>
  );
};

export default LandingPage; 