import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Link } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthDialog from '../components/AuthDialog';
import { features } from '../utils/environment';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isUser, isExpert, signOut, expert, user, signIn, register } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Check if we're on profile pages to hide header  
  const isProfilePage = location.pathname.includes('/user/profile');
  
  // Check if we're on expert pages for minimal header
  const isExpertPage = location.pathname.startsWith('/experts/') || 
                      location.pathname.toLowerCase().includes('stoic') || 
                      location.pathname.includes('the-stoic-mentor') ||
                      location.pathname.includes('stoic-mentor');

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleTrainAIClick = () => {
    // If onboarding is not completed, redirect to expert page (shows onboarding flow)
    if (isExpert && !expert?.onboarding_completed) {
      navigate('/expert');
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
        // Navigate to experts if feature is enabled, otherwise to home
        navigate(features.browseExperts ? '/experts' : '/');
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
          // Navigate to experts if feature is enabled, otherwise to home
          navigate(features.browseExperts ? '/experts' : '/');
        }
      }
      return result;
    } catch (error) {
      // Error is handled by the dialog
      throw error;
    }
  };

  const handleRegister = async (name: string, email: string, password: string, isExpertRegistration: boolean, userRole?: 'user' | 'expert') => {
    try {
      const result = await register(name, email, password, isExpertRegistration, userRole);
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
          // Navigate to experts if feature is enabled, otherwise to home
          navigate(features.browseExperts ? '/experts' : '/');
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
      {/* Show different headers based on page type */}
      {!isProfilePage && (
        <AppBar position="static" sx={{ backgroundColor: 'white', boxShadow: isExpertPage ? 'none' : 1 }}>
          <Toolbar 
            sx={{ 
              minHeight: isExpertPage ? '56px' : '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, md: 3 }
            }}
          >
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                color: 'primary.main',
                cursor: 'pointer',
                fontSize: isExpertPage ? '1.1rem' : '1.25rem',
                fontWeight: isExpertPage ? 500 : 600,
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => navigate('/')}
            >
              Duplix AI
            </Typography>
            
            {/* Navigation buttons */}
            {!isExpertPage && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Show Train AI button only for experts */}
                {isExpert && (
                  <Button
                    data-tour="train-ai"
                    color="primary"
                    onClick={handleTrainAIClick}
                    sx={{ 
                      color: location.pathname === '/train' ? 'primary.main' : 'text.secondary',
                      fontWeight: 500
                    }}
                  >
                    {expert?.onboarding_completed ? 'AI DASHBOARD' : 'SETUP PROFILE'}
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
                      fontWeight: 500
                    }}
                  >
                    MY PROFILE
                  </Button>
                )}
                
                {/* Browse Experts button - only visible for authenticated non-experts and when feature is enabled */}
                {features.browseExperts && isAuthenticated && !isExpert && (
                  <Button
                    data-tour="browse-experts"
                    color="primary"
                    onClick={() => navigate('/experts')}
                    sx={{ 
                      color: location.pathname === '/experts' ? 'primary.main' : 'text.secondary',
                      fontWeight: 500
                    }}
                  >
                    BROWSE EXPERTS
                  </Button>
                )}
                
                {/* Login button - only visible when not authenticated */}
                {!isAuthenticated && (
                  <Button
                    color="primary"
                    onClick={handleAuthClick}
                    sx={{ 
                      color: 'text.secondary',
                      fontWeight: 500,
                      px: 2,
                      py: 1
                    }}
                  >
                    LOGIN / SIGN UP
                  </Button>
                )}
                
                {/* Show username and logout when authenticated */}
                {isAuthenticated && (
                  <Button
                    color="primary"
                    onClick={handleLogout}
                    sx={{ 
                      fontWeight: 500,
                      px: 2,
                      py: 1
                    }}
                  >
                    LOGOUT
                  </Button>
                )}
              </Box>
            )}
          </Toolbar>
        </AppBar>
      )}
      


      {/* Authentication Dialog */}
      <AuthDialog
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignIn={(email, password, isExpertLogin) => handleSignIn(email, password, isExpertLogin)}
        onRegister={(name, email, password, isExpertRegistration, userRole) => handleRegister(name, email, password, isExpertRegistration, userRole)}
      />
      
      <Container component="main" sx={{ mt: (isExpertPage || isProfilePage) ? 0 : 4, mb: 8 }}>
        {children}
      </Container>
      
      {/* Beta Banner */}
      <Box sx={{ 
        backgroundColor: 'grey.50', 
        py: 1,
        borderTop: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'block',
              textAlign: 'center',
              fontSize: '0.75rem',
              opacity: 0.8
            }}
          >
            Powered by Duplix AI — currently in beta, features are evolving and occasional issues may occur
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          backgroundColor: 'grey.100', 
          py: 3, 
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'grey.300'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="body2" color="text.secondary">
              © 2025 Duplix AI Ltd. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Link 
                component="button"
                variant="body2" 
                color="text.secondary"
                onClick={() => navigate('/terms')}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Terms of Service
              </Link>
              <Link 
                component="button"
                variant="body2" 
                color="text.secondary"
                onClick={() => navigate('/privacy')}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Privacy Policy
              </Link>
              <Link 
                component="button"
                variant="body2" 
                color="text.secondary"
                onClick={() => navigate('/contact')}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Contact
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Layout; 