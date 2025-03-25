import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signOut, expert } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/');
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
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isAuthenticated ? (
              <>
                <Button 
                  color="primary"
                  onClick={() => navigate('/expert')}
                  sx={{ 
                    color: location.pathname === '/expert' ? 'primary.main' : 'text.secondary'
                  }}
                >
                  Expert Portal
                </Button>
                <Button 
                  color="primary"
                  onClick={() => navigate('/training')}
                  sx={{ 
                    color: location.pathname.startsWith('/training') ? 'primary.main' : 'text.secondary'
                  }}
                >
                  Train AI
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ color: 'text.primary' }}>
                    {expert?.name}
                  </Typography>
                  <Button 
                    color="primary"
                    onClick={handleLogout}
                  >
                    LOGOUT
                  </Button>
                </Box>
              </>
            ) : null}
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ mt: 4 }}>
        {children}
      </Container>
    </>
  );
};

export { Layout };
export default Layout; 