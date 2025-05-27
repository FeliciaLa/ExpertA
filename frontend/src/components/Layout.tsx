import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthDialog from '../components/AuthDialog';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isUser, isExpert, signOut, expert, user, signIn, register } = useAuth();
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleTrainAIClick = () => {
    // If onboarding is not completed, show dialog instead of navigating
    if (user?.role === 'expert' && !user.onboarding_completed) {
      setShowProfileAlert(true);
    } else {
      navigate('/train');
    }
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      // If already logged in, navigate based on role
      if (isExpert) {
        navigate('/expert');
      } else {
        navigate('/experts');
      }
    } else {
      // Open auth dialog for login/registration
      setIsAuthOpen(true);
    }
  };

  const handleSignIn = async (email: string, password: string, isExpertLogin: boolean) => {
    try {
      const result = await signIn(email, password, isExpertLogin);
      if (result.success) {
        if (isExpertLogin) {
          navigate('/expert');
        } else {
          navigate('/experts');
        }
      }
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  const handleRegister = async (name: string, email: string, password: string, isExpertRegistration: boolean) => {
    try {
      const result = await register(name, email, password, isExpertRegistration);
      if (result.success) {
        // If there's a verification message, don't navigate
        if (result.message && result.message.includes("verify")) {
          // User will stay on the dialog to see verification message
          return result;
        }
        // Only navigate if auto-login is performed
        if (isExpertRegistration) {
          navigate('/expert');
        } else {
          navigate('/experts');
        }
      }
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: 'white', boxShadow: 1 }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: 'primary.main',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            ExpertA
          </Typography>
          
          {/* Browse Experts button - only visible when authenticated */}
          {isAuthenticated && (
            <Button
              color="primary"
              onClick={() => navigate('/experts')}
              sx={{ 
                color: location.pathname === '/experts' ? 'primary.main' : 'text.secondary',
                mr: 2
              }}
            >
              BROWSE EXPERTS
            </Button>
          )}
          
          {/* My Profile button - visible for all authenticated users */}
          {isAuthenticated && (
            <Button
              color="primary"
              onClick={() => isExpert ? navigate('/expert') : navigate('/user/profile')}
              sx={{ 
                color: (isExpert && location.pathname === '/expert') || 
                      (!isExpert && location.pathname === '/user/profile') 
                      ? 'primary.main' : 'text.secondary',
                mr: 2
              }}
            >
              MY PROFILE
            </Button>
          )}
          
          {/* Login button - only visible when not authenticated */}
          {!isAuthenticated && (
            <Button
              color="primary"
              onClick={handleAuthClick}
              sx={{ 
                color: 'text.secondary',
                mr: 2
              }}
            >
              LOGIN / SIGN UP
            </Button>
          )}
          
          {/* Show Train AI button only for experts */}
          {isExpert && (
            <Button
              color="primary"
              onClick={handleTrainAIClick}
              sx={{ 
                color: location.pathname === '/train' ? 'primary.main' : 'text.secondary',
                mr: 2
              }}
            >
              TRAIN AI
            </Button>
          )}
          
          {/* Show username and logout when authenticated */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                color="primary"
                onClick={handleLogout}
              >
                LOGOUT
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Profile Setup Alert Dialog */}
      <Dialog
        open={showProfileAlert}
        onClose={() => setShowProfileAlert(false)}
      >
        <DialogTitle>
          Profile Setup Required
          <IconButton
            aria-label="close"
            onClick={() => setShowProfileAlert(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You need to complete your profile setup before you can train your AI.
          </DialogContentText>
        </DialogContent>
      </Dialog>

      {/* Authentication Dialog */}
      <AuthDialog
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignIn={(email, password, isExpertLogin) => handleSignIn(email, password, isExpertLogin)}
        onRegister={(name, email, password, isExpertRegistration) => handleRegister(name, email, password, isExpertRegistration)}
      />
      
      <Container component="main" sx={{ mt: 4 }}>
        {children}
      </Container>
    </>
  );
};

export default Layout; 