import React, { useState } from 'react';
import { Container, Typography, Box, Paper, TextField, Button, Grid, Alert, Snackbar } from '@mui/material';
import { Email, LocationOn, Phone, BusinessCenter } from '@mui/icons-material';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link with form data
    const mailtoLink = `mailto:admin@duplixai.co.uk?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    
    // Open email client
    window.open(mailtoLink);
    
    // Show success message
    setShowSuccess(true);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
        Contact Duplix AI
      </Typography>
      
      <Typography variant="h6" component="p" align="center" color="text.secondary" sx={{ mb: 4 }}>
        We'd love to hear from you. Get in touch with our team.
      </Typography>

      <Grid container spacing={4}>
        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h4" component="h2" gutterBottom color="primary">
              Get in Touch
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Email color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    Email
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    admin@duplixai.co.uk
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <BusinessCenter color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    Company
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duplix AI Ltd
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registered in the United Kingdom
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LocationOn color="primary" />
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    Support Hours
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monday - Friday: 9:00 AM - 6:00 PM GMT
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Response within 24 hours
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 4, p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                What can we help you with?
              </Typography>
              <Typography variant="body2" paragraph>
                • Technical support and platform issues
              </Typography>
              <Typography variant="body2" paragraph>
                • Expert onboarding and training assistance
              </Typography>
              <Typography variant="body2" paragraph>
                • Business partnerships and collaborations
              </Typography>
              <Typography variant="body2" paragraph>
                • Privacy and data protection inquiries
              </Typography>
              <Typography variant="body2">
                • General questions about Duplix AI
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Contact Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h4" component="h2" gutterBottom color="primary">
              Send us a Message
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Your Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Message"
                name="message"
                multiline
                rows={6}
                value={formData.message}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
              />
              
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Send Message
              </Button>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                This will open your email client with a pre-filled message.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Success Snackbar */}
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Email client opened! Please send your message from your email application.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Contact; 