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
  const [isExpertAuthOpen, setIsExpertAuthOpen] = useState(false);
  const [isExpertRegistration, setIsExpertRegistration] = useState(false);
  const theme = useTheme();

  const handleExpertClick = () => {
    if (isAuthenticated) {
      navigate('/expert');
    } else {
      setIsExpertAuthOpen(true);
    }
  };

  const handleSignIn = async (email: string, password: string, isExpertLogin: boolean): Promise<{ success: boolean; message?: string }> => {
    try {
      await signIn(email, password);
      navigate('/expert');
      return { success: true };
    } catch (error) {
      // Error is handled by the dialog
      return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const handleRegister = async (name: string, email: string, password: string, isExpertRegistration: boolean, userRole?: 'user' | 'expert'): Promise<{ success: boolean; message?: string }> => {
    try {
      await register(name, email, password, isExpertRegistration, userRole);
      return { success: true };
    } catch (error) {
      // Error is handled by the dialog
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  // Function to handle expert link click
  const handleExpertRegisterClick = () => {
    setIsExpertRegistration(true);
    setIsExpertAuthOpen(true);
  };

  // Function to handle auth dialog close
  const handleAuthDialogClose = () => {
    setIsExpertAuthOpen(false);
    setIsExpertRegistration(false);
  };

  return (
    <>
      <Box 
        sx={{ 
          backgroundColor: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ mt: { xs: 8, md: 12 }, mb: { xs: 6, md: 10 } }}>
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
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              Learn from AI trained by real experts
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
              AI experts built on real-world knowledge from professionals across industries.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/experts')}
                sx={{ 
                  py: 1.5,
                  px: 4,
                  fontSize: '1.1rem',
                  borderRadius: 2
                }}
              >
                Browse Experts
              </Button>
              
              <Link
                component="button"
                variant="body1"
                onClick={handleExpertRegisterClick}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Are you an expert? Start training your AI 
                <ArrowForwardIcon fontSize="small" sx={{ ml: 0.5 }} />
              </Link>
            </Box>
          </Box>
        </Container>

        {/* How It Works Section */}
        <Box sx={{ backgroundColor: 'grey.50', py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Typography 
              variant="h4" 
              component="h2" 
              textAlign="center" 
              gutterBottom
              sx={{ 
                mb: 6,
                fontWeight: 600
              }}
            >
              How It Works
            </Typography>

            <Grid container spacing={4} justifyContent="center">
              {/* Step 1 */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2
                  }}
                >
                  <Box 
                    sx={{ 
                      backgroundColor: 'primary.light', 
                      color: 'primary.main',
                      borderRadius: '50%',
                      width: 80,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <PersonIcon fontSize="large" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      Experts join & train AIs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Industry professionals share their knowledge and expertise through conversation and document uploads.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Step 2 */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2
                  }}
                >
                  <Box 
                    sx={{ 
                      backgroundColor: 'primary.light', 
                      color: 'primary.main',
                      borderRadius: '50%',
                      width: 80,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <QuestionAnswerIcon fontSize="large" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      You ask questions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connect with AI experts in your field and get answers to your specific questions and challenges.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Step 3 */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2
                  }}
                >
                  <Box 
                    sx={{ 
                      backgroundColor: 'primary.light', 
                      color: 'primary.main',
                      borderRadius: '50%',
                      width: 80,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <PsychologyIcon fontSize="large" />
                  </Box>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      Get better answers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Benefit from accurate, expert-backed answers that go beyond generic AI responses.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>

      <AuthDialog
        open={isExpertAuthOpen}
        onClose={handleAuthDialogClose}
        onSignIn={handleSignIn}
        onRegister={handleRegister}
        expertRegisterOnly={isExpertRegistration}
      />
    </>
  );
};

export default LandingPage; 