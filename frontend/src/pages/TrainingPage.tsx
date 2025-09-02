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
  console.log('🎯 TRAINING PAGE COMPONENT RENDERED');
  console.log('Current URL:', window.location.href);
  console.log('Current pathname:', window.location.pathname);
  
  const [tabIndex, setTabIndex] = useState(1); // Changed from 0 to 1 to make Document Upload default
  const [showTrainingWalkthrough, setShowTrainingWalkthrough] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome message
    const welcomed = localStorage.getItem('trainingWelcomeSeen');
    if (!welcomed) {
      // First time visiting training page, show walkthrough modal
      setHasSeenWelcome(false);
      setShowTrainingWalkthrough(true);
    } else {
      setHasSeenWelcome(true);
    }
  }, []);

  const handleWelcomeDismiss = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('trainingWelcomeSeen', 'true');
  };

  const handleInfoClick = () => {
    setShowTrainingWalkthrough(true);
  };

  const handleCloseWalkthrough = () => {
    setShowTrainingWalkthrough(false);
    // Mark welcome as seen so walkthrough doesn't show again
    if (!hasSeenWelcome) {
      setHasSeenWelcome(true);
      localStorage.setItem('trainingWelcomeSeen', 'true');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const welcomeContent = (
    <>
      <AlertTitle sx={{ fontWeight: 600 }}>Welcome to AI Training!</AlertTitle>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Now that your profile is set up, it's time to train your AI assistant with your expertise. 
        Start by uploading documents (PDFs, Word docs, etc.) that showcase your knowledge, 
        or use Q&A Training to teach your AI through conversation. 
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
          <Tooltip title="How training works - Get help">
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

      {/* Training Walkthrough Dialog */}
      <Dialog 
        open={showTrainingWalkthrough} 
        onClose={handleCloseWalkthrough}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="h5" color="primary" gutterBottom>
            🎯 How Training Works
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Your AI needs to learn from you before it can help users
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h5" sx={{ mr: 2, color: 'primary.main' }}>📄</Typography>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  STEP 1: Upload Knowledge (5-10 minutes)
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Add documents, case studies, or guides you've written<br/>
                  • Your AI will learn from your actual work examples<br/>
                  • This helps your AI give more accurate, detailed responses
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h5" sx={{ mr: 2, color: 'primary.main' }}>📚</Typography>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  STEP 2: Chat Training (15-30 minutes)
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Your AI will ask you questions about real scenarios<br/>
                  • Answer like you're talking to a client<br/>
                  • The more detailed your answers, the smarter your AI becomes
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Typography variant="h5" sx={{ mr: 2, color: 'primary.main' }}>✅</Typography>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  STEP 3: Test & Share
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Test your AI to make sure it sounds like you<br/>
                  • Activate for free and get 200 messages<br/>
                  • Start getting consultations through your AI
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', p: 3 }}>
          <Button
            variant="contained"
            onClick={handleCloseWalkthrough}
            size="large"
          >
            Start Training Now
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
            icon={<UploadFileIcon />} 
            label="Document Upload" 
            id="training-tab-0" 
            aria-controls="training-tabpanel-0" 
          />
          <Tab 
            icon={<ChatIcon />} 
            label="Q&A Training" 
            id="training-tab-1" 
            aria-controls="training-tabpanel-1" 
          />
        </Tabs>

        <TabPanel value={tabIndex} index={0}>
          {tabIndex === 0 && <DocumentUpload />}
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          {tabIndex === 1 && <TrainingChat />}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TrainingPage; 