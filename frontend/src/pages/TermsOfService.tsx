import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const TermsOfService: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Expert A — Terms of Use
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Effective Date: June 6, 2024
        </Typography>

        <Box sx={{ '& > *': { mb: 3 } }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to Expert A! These Terms of Use ("Terms") govern your access to and use of the 
              Expert A platform ("Platform"), operated by the Platform Operator ("Operator", "we", "us", 
              or "our"), currently under individual ownership and later possibly through a registered 
              business entity. By using our Platform, you agree to comply with these Terms.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              2. Eligibility
            </Typography>
            <Typography variant="body1" paragraph>
              To use our Platform, you must be at least 16 years old. By using Expert A, you represent and 
              warrant that you meet this requirement.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              3. Platform Purpose
            </Typography>
            <Typography variant="body1" paragraph>
              Expert A provides a marketplace where experts can build AI-powered chatbot personas and 
              offer them to users for informational and educational purposes.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              4. Account Registration
            </Typography>
            <Typography variant="body1" paragraph>
              To access and use the chatbot services, you must create an account and provide accurate 
              and complete information. You are responsible for maintaining the confidentiality of your 
              login credentials.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              5. Content Ownership
            </Typography>
            <Typography variant="body1" paragraph>
              Experts retain ownership of the training documents, data, and other materials they upload 
              to train their chatbots. By uploading content, experts grant us a limited, non-exclusive 
              license to host, store, and display such content solely for the purpose of operating the 
              Platform and providing services to users.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              6. User Conduct
            </Typography>
            <Typography variant="body1" paragraph>
              You agree not to:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">Use the Platform for any unlawful, harmful, or offensive purposes;</Typography>
              <Typography component="li">Impersonate others or provide false information;</Typography>
              <Typography component="li">Attempt to access accounts or data that do not belong to you;</Typography>
              <Typography component="li">Interfere with the Platform's functionality or security.</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              7. Payment Terms
            </Typography>
            <Typography variant="body1" paragraph>
              Some experts may charge fees for their consultation services. Payment processing is handled 
              through secure third-party providers. All fees are clearly displayed before any transaction. 
              Refunds are subject to our refund policy and expert discretion.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              8. Limitation of Liability
            </Typography>
            <Typography variant="body1" paragraph>
              The Platform and its services are provided "as is" without warranties. We are not liable 
              for any damages arising from your use of the Platform or interactions with experts.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              9. Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Your privacy is important to us. Please review our Privacy Policy to understand how we 
              collect, use, and protect your information.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              10. Changes to Terms
            </Typography>
            <Typography variant="body1" paragraph>
              We may update these Terms from time to time. We will notify users of significant changes 
              via email or platform notifications.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              11. Contact Information
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about these Terms, please contact us at a00938724@gmail.com.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfService; 