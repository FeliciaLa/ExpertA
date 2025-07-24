import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import { 
  Preview, 
  Launch, 
  Share, 
  Chat,
  CheckCircle,
  Visibility,
  Payment
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ExpertActivationPayment from './ExpertSubscriptionPayment';
import { useNavigate } from 'react-router-dom';

const ExpertActivationPage: React.FC = () => {
  const [showPayment, setShowPayment] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const { user, expert } = useAuth();
  const navigate = useNavigate();

  // Mock preview URL (in real implementation, this would be dynamic)
  const previewUrl = `duplixai.co.uk/experts/${user?.name?.toLowerCase().replace(/\s+/g, '-') || 'your-name'}`;

  const handleActivationSuccess = () => {
    setIsActivated(true);
    setShowPayment(false);
    
    // Redirect to expert dashboard after a moment
    setTimeout(() => {
      navigate('/expert-dashboard'); // Adjust route as needed
    }, 3000);
  };

  if (isActivated) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
        <Typography variant="h3" gutterBottom color="success.main">
          🎉 Your AI Expert is LIVE!
        </Typography>
        <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 4 }}>
          Your AI expert is now publicly accessible and ready to help users worldwide
        </Typography>
        
        <Paper sx={{ p: 4, mb: 4, bgcolor: 'rgba(46, 125, 50, 0.05)' }}>
          <Typography variant="h6" gutterBottom>
            🔗 Your Live AI Expert URL:
          </Typography>
          <Typography 
            variant="h5" 
            color="primary" 
            sx={{ 
              fontFamily: 'monospace', 
              bgcolor: 'background.paper', 
              p: 2, 
              borderRadius: 1,
              border: '2px solid',
              borderColor: 'primary.main'
            }}
          >
            {previewUrl}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Share />}
            sx={{ mt: 2 }}
            onClick={() => {
              navigator.clipboard.writeText(`https://${previewUrl}`);
              // Could add a toast notification here
            }}
          >
            Copy Link to Share
          </Button>
        </Paper>

        <Typography variant="body1" color="text.secondary">
          Redirecting you to your expert dashboard...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" gutterBottom>
          🚀 Ready to Launch Your AI Expert?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Your profile is complete! Preview how it will look to users, then activate it.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Preview Section */}
        <Grid item xs={12} md={7}>
          <Paper 
            elevation={3}
            sx={{ 
              p: 3, 
              height: 'fit-content',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
              border: '2px solid rgba(102, 126, 234, 0.2)'
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Preview color="primary" />
              <Typography variant="h5" fontWeight="bold">
                Preview: Your AI Expert Page
              </Typography>
            </Box>

            {/* Mock Expert Profile Preview */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={3} mb={3}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {user?.name?.charAt(0) || 'E'}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      {user?.name || 'Expert Name'}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {expert?.profile?.industry || 'Professional Expert'}
                    </Typography>
                    <Chip 
                      label="AI Expert" 
                      color="primary" 
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Box>

                <Typography variant="body1" paragraph>
                  {expert?.bio || `I'm ${user?.name}, an experienced professional ready to help you with expert advice and insights.`}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Experience: {expert?.profile?.years_of_experience || 5}+ years
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Specialties: {expert?.profile?.key_skills || 'Professional expertise'}
                </Typography>
              </CardContent>
            </Card>

            {/* Preview URL */}
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                Your AI expert will be accessible at:
              </Typography>
              <Typography variant="body2" fontFamily="monospace" color="primary">
                {previewUrl}
              </Typography>
            </Paper>

            {/* Mock Chat Preview */}
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                <Chat sx={{ mr: 1, verticalAlign: 'middle' }} />
                How Users Will Interact:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  💬 <strong>User:</strong> "Can you help me with [their question]?"
                </Typography>
                <Typography variant="body2" color="primary" paragraph>
                  🤖 <strong>Your AI:</strong> "Of course! Based on my experience as {user?.name}..."
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <em>Each conversation trains your AI to respond more like you</em>
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>

        {/* Activation Section */}
        <Grid item xs={12} md={5}>
          <Paper 
            elevation={3}
            sx={{ 
              p: 3,
              background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(56, 142, 60, 0.05) 100%)',
              border: '2px solid rgba(46, 125, 50, 0.2)',
              position: 'sticky',
              top: 20
            }}
          >
            <Box textAlign="center" mb={3}>
              <Launch sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Activate Your AI Expert
              </Typography>
              <Typography variant="body1" color="text.secondary">
                One-time payment to make your AI expert live and accessible worldwide
              </Typography>
            </Box>

            {/* What You Get */}
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                ✨ What You Get:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  ✅ <strong>Live AI Expert</strong> - Public and shareable
                </Typography>
                <Typography variant="body2">
                  ✅ <strong>Custom URL</strong> - Professional link for marketing
                </Typography>
                <Typography variant="body2">
                  ✅ <strong>200 Interactions</strong> - Worth £200+ in consultation value
                </Typography>
                <Typography variant="body2">
                  ✅ <strong>Auto-Training</strong> - AI learns from each conversation
                </Typography>
                <Typography variant="body2">
                  ✅ <strong>24/7 Availability</strong> - Help users while you sleep
                </Typography>
                <Typography variant="body2">
                  ✅ <strong>Analytics Dashboard</strong> - Track engagement & impact
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Pricing */}
            <Box textAlign="center" mb={3}>
              <Typography variant="h3" color="primary" gutterBottom>
                £9.99
              </Typography>
              <Typography variant="body2" color="text.secondary">
                One-time activation fee • No monthly charges
              </Typography>
            </Box>

            {/* CTA Buttons */}
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Payment />}
                onClick={() => setShowPayment(true)}
                sx={{ 
                  py: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Activate for £9.99
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={() => {
                  // Open preview in new tab
                  window.open(`/experts/${user?.id}`, '_blank');
                }}
              >
                Test Preview (Coming Soon)
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
              💡 <strong>Tip:</strong> Share your expert link on social media, your website, and business cards to maximize reach
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Payment Dialog */}
      {showPayment && (
        <ExpertActivationPayment
          onPaymentSuccess={handleActivationSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </Container>
  );
};

export default ExpertActivationPage; 