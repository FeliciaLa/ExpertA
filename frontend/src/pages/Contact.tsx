import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { Email } from '@mui/icons-material';

const Contact: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          Contact Us
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          We'd love to hear from you. Get in touch with our team.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Email color="primary" sx={{ fontSize: 48 }} />
          
          <Typography variant="h6" component="h2" color="primary">
            Email Us
          </Typography>
          
          <Typography 
            variant="h5" 
            component="a" 
            href="mailto:admin@duplixai.co.uk"
            sx={{ 
              textDecoration: 'none', 
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            admin@duplixai.co.uk
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            We typically respond within 24 hours
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Contact; 