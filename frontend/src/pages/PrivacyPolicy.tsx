import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Expert A — Privacy Policy
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Effective Date: June 6, 2024
        </Typography>

        <Box sx={{ '& > *': { mb: 3 } }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              1. Information We Collect
            </Typography>
            <Typography variant="body1" paragraph>
              We collect information you provide directly to us, such as when you create an account, 
              upload training materials, or communicate with experts through our platform.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Personal Information:</strong> Name, email address, profile information, and payment details.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Content:</strong> Training documents, chat conversations, and expert knowledge materials.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Usage Data:</strong> Information about how you use our platform, including log data and analytics.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              2. How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use the information we collect to:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">Provide and maintain our services</Typography>
              <Typography component="li">Process payments and transactions</Typography>
              <Typography component="li">Train AI models for expert chatbots</Typography>
              <Typography component="li">Communicate with you about our services</Typography>
              <Typography component="li">Improve our platform and user experience</Typography>
              <Typography component="li">Ensure platform security and prevent fraud</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              3. Information Sharing
            </Typography>
            <Typography variant="body1" paragraph>
              We do not sell, trade, or rent your personal information to third parties. We may share 
              information in the following circumstances:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">With experts when you engage their services</Typography>
              <Typography component="li">With service providers who assist in platform operations</Typography>
              <Typography component="li">When required by law or to protect our rights</Typography>
              <Typography component="li">In connection with a business transfer or acquisition</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              4. AI Training and Data Processing
            </Typography>
            <Typography variant="body1" paragraph>
              Expert-uploaded content is used to train AI models specific to each expert. This data is:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">Processed using secure third-party AI services (OpenAI)</Typography>
              <Typography component="li">Stored in encrypted vector databases</Typography>
              <Typography component="li">Used only for the specific expert's chatbot</Typography>
              <Typography component="li">Not shared between different experts</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              5. Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement appropriate security measures to protect your information, including:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">Encryption of data in transit and at rest</Typography>
              <Typography component="li">Secure payment processing through Stripe</Typography>
              <Typography component="li">Regular security audits and updates</Typography>
              <Typography component="li">Access controls and authentication measures</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              6. Your Rights and Choices
            </Typography>
            <Typography variant="body1" paragraph>
              You have the right to:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">Access and update your personal information</Typography>
              <Typography component="li">Delete your account and associated data</Typography>
              <Typography component="li">Export your data in a portable format</Typography>
              <Typography component="li">Opt out of non-essential communications</Typography>
              <Typography component="li">Request correction of inaccurate information</Typography>
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              7. Cookies and Tracking
            </Typography>
            <Typography variant="body1" paragraph>
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
              and maintain your session. You can control cookie settings through your browser preferences.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              8. Third-Party Services
            </Typography>
            <Typography variant="body1" paragraph>
              Our platform integrates with third-party services including:
            </Typography>
            <Typography component="ul" sx={{ pl: 3 }}>
              <Typography component="li">OpenAI for AI processing</Typography>
              <Typography component="li">Stripe for payment processing</Typography>
              <Typography component="li">Pinecone for vector database storage</Typography>
              <Typography component="li">Heroku and Vercel for hosting</Typography>
            </Typography>
            <Typography variant="body1" paragraph>
              These services have their own privacy policies governing their use of your information.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              9. Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our platform is not intended for users under 16 years of age. We do not knowingly collect 
              personal information from children under 16.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              10. Changes to This Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any material 
              changes by email or through our platform.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" component="h2" gutterBottom color="primary">
              11. Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </Typography>
            <Typography variant="body1" paragraph>
              Email: a00938724@gmail.com
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy; 