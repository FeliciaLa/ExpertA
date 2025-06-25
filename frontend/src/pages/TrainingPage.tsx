import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import { DocumentUpload } from '../components/DocumentUpload';
import { TrainingChat } from '../components/TrainingChat';
import { AITrainingProgress } from '../components/AITrainingProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TrainingPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message
    const welcomed = localStorage.getItem('trainingWelcomeSeen');
    if (!welcomed) {
      // First time visiting training page, show welcome alert
      setHasSeenWelcome(false);
    } else {
      setHasSeenWelcome(true);
    }
  }, []);

  const handleWelcomeDismiss = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('trainingWelcomeSeen', 'true');
  };

  const handleInfoClick = () => {
    setShowWelcomeDialog(true);
  };

  const handleCloseDialog = () => {
    setShowWelcomeDialog(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const welcomeContent = (
    <>
      <AlertTitle sx={{ fontWeight: 600 }}>Welcome to AI Training!</AlertTitle>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Now that your profile is set up, it's time to train your AI assistant with your expertise. 
        Start with Q&A Training to teach your AI through conversation, 
        or upload documents (PDFs, Word docs, etc.) that showcase your knowledge. 
        The more you train it, the better it becomes at representing your expertise to potential clients.
      </Typography>
    </>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header with optional info icon */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Typography variant="h4">
          AI Training Dashboard
        </Typography>
        
        {hasSeenWelcome && (
          <Tooltip title="Show welcome information">
            <IconButton 
              onClick={handleInfoClick}
              sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                width: 40,
                height: 40
              }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Welcome Explainer - only show on first visit */}
      {!hasSeenWelcome && (
        <Alert 
          severity="info" 
          icon={<InfoIcon />}
          sx={{ mb: 4 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleWelcomeDismiss}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {welcomeContent}
        </Alert>
      )}

      {/* Welcome Dialog for returning users */}
      <Dialog 
        open={showWelcomeDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
            Welcome to AI Training!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Now that your profile is set up, it's time to train your AI assistant with your expertise. 
            Start with Q&A Training to teach your AI through conversation, 
            or upload documents (PDFs, Word docs, etc.) that showcase your knowledge. 
            The more you train it, the better it becomes at representing your expertise to potential clients.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Training Progress */}
      <AITrainingProgress />

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          aria-label="training tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<ChatIcon />} 
            label="Q&A Training" 
            id="training-tab-0" 
            aria-controls="training-tabpanel-0" 
          />
          <Tab 
            icon={<UploadFileIcon />} 
            label="Document Upload" 
            id="training-tab-1" 
            aria-controls="training-tabpanel-1" 
          />
        </Tabs>

        <TabPanel value={tabIndex} index={0}>
          {tabIndex === 0 && <TrainingChat />}
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <DocumentUpload />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TrainingPage; 