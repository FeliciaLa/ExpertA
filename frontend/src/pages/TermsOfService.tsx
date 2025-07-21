import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const TermsOfService: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Duplix AI — Terms of Use
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Effective Date: June 6, 2024
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last Updated: June 25, 2025
        </Typography>

        <Box sx={{ '& > *': { mb: 3 } }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Welcome to Duplix AI! These Terms of Use ("Terms") govern your access to and use of the 
              Duplix AI platform ("Platform"), operated by Duplix AI Ltd ("Operator", "we", "us", 
              or "our"), a company registered in the United Kingdom. By using our Platform, you agree to comply with these Terms.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              2. Eligibility
            </Typography>
            <Typography variant="body1" paragraph>
              To use our Platform, you must be at least 16 years old. By using Duplix AI, you represent and 
              warrant that you meet this requirement.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              3. Platform Purpose
            </Typography>
            <Typography variant="body1" paragraph>
              Duplix AI provides a marketplace where experts can build AI-powered chatbot personas and 
              offer them to users for informational and educational purposes.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              4. Account Registration
            </Typography>
            <Typography variant="body1" paragraph>
              To access and use the Platform, you must create an account and provide accurate 
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
              <strong>For Users:</strong> Some experts may charge fees for their chatbot consultation services. Payment processing is handled 
              through secure third-party providers. All fees are clearly displayed before any transaction. 
              Refunds are subject to our refund policy and expert discretion.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>For Experts:</strong> If you offer paid services, you agree to the revenue-sharing terms defined separately by the Platform. Payments are processed through Stripe Connect, and you are responsible for any applicable taxes or reporting obligations.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              8. Limitation of Liability
            </Typography>
            <Typography variant="body1" paragraph>
              The Platform and its services are provided "as is" without warranties. We are not liable 
              for any damages arising from your use of the Platform, chatbot outputs, or interactions between users and experts. Chatbots do not provide professional advice and should not be relied upon as such.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              9. Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Your privacy is important to us. Please review our [Privacy Policy] to understand how we 
              collect, use, and protect your information.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              10. Changes to Terms
            </Typography>
            <Typography variant="body1" paragraph>
              We may update these Terms from time to time. We will notify users and experts of significant changes 
              via email or platform notifications.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              11. Disclaimer and AI Limitations
            </Typography>
            <Typography variant="body1" paragraph>
              Duplix AI is currently in active development and provided as a beta product. While we strive for stability and quality, users and experts may experience delays, technical issues, or occasional inaccuracies in chatbot outputs.
            </Typography>
            <Typography variant="body1" paragraph>
              AI-generated responses are based on the content provided by experts and external training data, but they may contain errors, hallucinations, or misinterpretations. These responses do not represent professional advice, and users should not rely on them for decision-making without independent verification.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Important Health and Safety Notice:</strong> Our AI chatbots are not a substitute for professional medical, mental health, therapeutic, legal, financial, or other professional services. If you are experiencing a mental health crisis or emergency situation, please contact emergency services or a qualified mental health professional immediately. Do not use this platform for urgent health or safety matters.
            </Typography>
            <Typography variant="body1" paragraph>
              Experts understand that the chatbots may not always reflect their voice or views accurately and may produce unintended or simplified responses. Users understand that they are interacting with AI personas—not live human experts—and accept the limitations that come with automated systems.
            </Typography>
            <Typography variant="body1" paragraph>
              Use of the platform is at your own risk. We disclaim any liability for damages, decisions, or losses resulting from reliance on chatbot output or system availability.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              12. Contact Information
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about these Terms, please contact us at:
            </Typography>
            <Typography variant="body1" paragraph>
              Email: <a href="mailto:admin@duplixai.co.uk">admin@duplixai.co.uk</a>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfService; 