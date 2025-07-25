import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Link, 
  Card, 
  CardContent,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthDialog from '../components/AuthDialog';
import PersonIcon from '@mui/icons-material/Person';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, register, isAuthenticated } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const theme = useTheme();

  const handleExpertClick = () => {
    if (isAuthenticated) {
      navigate('/expert');
    } else {
      setIsAuthOpen(true);
    }
  };

  // Use the same auth handlers as Layout component for consistency
  const handleSignIn = async (email: string, password: string, isExpertLogin: boolean) => {
    try {
      const result = await signIn(email, password, isExpertLogin);
      if (result.success) {
        if (isExpertLogin) {
          navigate('/expert');
        } else {
          navigate('/');
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (name: string, email: string, password: string, isExpertRegistration: boolean, userRole?: 'user' | 'expert') => {
    try {
      const result = await register(name, email, password, isExpertRegistration, userRole);
      if (result.success) {
        // If there's a verification message, don't navigate
        if (result.message && result.message.includes("verify")) {
          return result;
        }
        // Only navigate if auto-login is performed
        if (isExpertRegistration) {
          navigate('/expert');
        } else {
          navigate('/');
        }
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 8 }, mb: { xs: 4, md: 6 } }}>
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              p: { xs: 4, md: 6 },
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              zIndex: 1
            }}
          >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              textAlign: 'center',
              maxWidth: 800,
              mx: 'auto'
            }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 700,
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Duplicate your knowledge with AI
            </Typography>
            
            <Typography 
              variant="h6" 
              component="h2" 
              color="text.secondary"
              sx={{ 
                mb: 5,
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              Turn your expertise into a shareable, intelligent chatbot and scale your reach
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleExpertClick}
                sx={{ 
                  py: 2,
                  px: 5,
                  fontSize: '1.2rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Start training your AI
              </Button>
            </Box>
          </Box>
        </Paper>
        </Container>

        {/* How It Works Section */}
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2, md: 3 } }}>
          <Paper
            elevation={0}
            sx={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              p: { xs: 4, md: 6 },
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              zIndex: 1,
              overflow: 'hidden'
            }}
          >
            <Typography 
              variant="h4" 
              component="h2" 
              textAlign="center" 
              gutterBottom
              sx={{ 
                mb: 6,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              How It Works
            </Typography>

            <Grid container spacing={2} justifyContent="center" sx={{ mt: 2, px: 1 }}>
              {/* Step 1 */}
              <Grid item xs={12} md={4} sx={{ px: 1 }}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 6px 28px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white',
                      borderRadius: '50%',
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: { xs: 1.5, md: 2 },
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <PersonIcon fontSize="medium" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Train your AI duplicate
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload your knowledge and train an AI that thinks, responds, and advises just like you do.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Step 2 */}
              <Grid item xs={12} md={4} sx={{ px: 1 }}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 6px 28px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white',
                      borderRadius: '50%',
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: { xs: 1.5, md: 2 },
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <QuestionAnswerIcon fontSize="medium" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Share with your audience
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Embed your AI on your website, share on social media, or give direct access to your clients and followers.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Step 3 */}
              <Grid item xs={12} md={4} sx={{ px: 1 }}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 6px 28px rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: 'white',
                      borderRadius: '50%',
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: { xs: 1.5, md: 2 },
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <PsychologyIcon fontSize="medium" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      Scale your expertise
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Help more people simultaneously while maintaining your unique insights and personal touch. Your AI works 24/7.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
          </Container>
      </Box>

      <AuthDialog
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSignIn={handleSignIn}
        onRegister={handleRegister}
        defaultTab={1}
      />
    </>
  );
};

export default LandingPage; 