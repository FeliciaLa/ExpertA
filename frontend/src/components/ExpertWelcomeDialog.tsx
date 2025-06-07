import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  AccountCircle,
  Psychology,
  Chat,
  CheckCircle
} from '@mui/icons-material';

interface ExpertWelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  expertName?: string;
}

export const ExpertWelcomeDialog: React.FC<ExpertWelcomeDialogProps> = ({
  open,
  onClose,
  expertName
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 1 }} />
          <Typography variant="h4" component="span" color="primary">
            Welcome to ExpertA!
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          {expertName ? `Hi ${expertName}! ` : ''}Your expert account has been created successfully.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
          Here's what you can do next:
        </Typography>

        <List sx={{ mt: 2 }}>
          <ListItem>
            <ListItemIcon>
              <AccountCircle color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="1. Complete Your Profile"
              secondary="Add your professional details, bio, and expertise areas to help users understand your background."
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <Psychology color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="2. Train Your AI Assistant"
              secondary="Participate in an interactive training session where you'll answer questions about your expertise. This teaches the AI to respond like you."
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <Chat color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="3. Start Helping Users"
              secondary="Once trained, users can chat with your AI assistant to get expert advice based on your knowledge and experience."
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1 }}>
          <Typography variant="body2" color="primary.contrastText">
            <strong>💡 Pro Tip:</strong> The more detailed and specific your profile and training responses are, 
            the better your AI assistant will be at helping users with questions in your area of expertise.
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          You can always access your profile and training from the navigation menu above.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{ minWidth: 200 }}
        >
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 