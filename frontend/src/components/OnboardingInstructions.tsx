import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  Psychology,
  QuestionAnswer,
  AutoAwesome,
  Timer,
  CheckCircle
} from '@mui/icons-material';

interface OnboardingInstructionsProps {
  onStart: () => void;
  onSkip?: () => void;
}

export const OnboardingInstructions: React.FC<OnboardingInstructionsProps> = ({ onStart, onSkip }) => {
  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Psychology sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom color="primary">
          Train Your AI Assistant
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Help us create an AI that thinks and responds like you
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        How It Works
      </Typography>
      
      <List sx={{ mb: 3 }}>
        <ListItem>
          <ListItemIcon>
            <QuestionAnswer color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Interactive Training Session"
            secondary="We'll ask you questions about your expertise, experience, and approach to solving problems in your field."
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <Psychology color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Knowledge Capture"
            secondary="Your responses help the AI understand your unique perspective, methodologies, and problem-solving style."
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <AutoAwesome color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="AI Training"
            secondary="The AI learns from your answers to provide responses that reflect your expertise and personality."
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <Timer color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Quick & Easy"
            secondary="Takes about 10-15 minutes. You can pause and resume anytime."
          />
        </ListItem>
      </List>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> The more detailed and specific your answers, the better your AI assistant will be at helping users with questions in your area of expertise.
        </Typography>
      </Alert>

      <Typography variant="h6" gutterBottom>
        What to Expect
      </Typography>
      
      <Typography variant="body1" paragraph>
        During the training session, you'll be asked about:
      </Typography>
      
      <Box sx={{ ml: 2, mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Your professional background and experience
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Your approach to solving common problems
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Specific methodologies and tools you use
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Real examples from your work experience
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • Your communication style and preferences
        </Typography>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle sx={{ mr: 1 }} />
          <Typography variant="body2">
            Once complete, users will be able to chat with an AI that represents your expertise!
          </Typography>
        </Box>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onStart}
          sx={{ minWidth: 200 }}
        >
          Start Training Session
        </Button>
        {onSkip && (
          <Button
            variant="outlined"
            size="large"
            onClick={onSkip}
            sx={{ minWidth: 120 }}
          >
            Skip for Now
          </Button>
        )}
      </Box>
    </Paper>
  );
}; 