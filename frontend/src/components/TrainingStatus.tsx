import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DocumentUpload from './DocumentUpload';
import ChatIcon from '@mui/icons-material/Chat';
import UploadFileIcon from '@mui/icons-material/UploadFile';

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

export const TrainingStatus: React.FC = () => {
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  
  // Simplified auth usage
  let expert = null;
  let authError = null;
  
  try {
    const auth = useAuth();
    expert = auth.expert;
  } catch (error) {
    console.error('Auth error:', error);
    authError = error;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleStartTraining = () => {
    if (!expert?.onboarding_completed) {
      navigate('/expert');
    } else {
      navigate('/train/chat');
    }
  };

  // Show error if auth failed
  if (authError) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Typography variant="h4" color="error" gutterBottom>
          Authentication Error
        </Typography>
        <Typography color="error">
          {authError.toString()}
        </Typography>
      </Box>
    );
  }

  // Show loading if no expert data
  if (!expert) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading expert data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Train your AI Expert
      </Typography>

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
          <DocumentUpload />
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <Box sx={{ p: 3, minHeight: '400px', bgcolor: 'background.paper' }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              ✅ SIMPLIFIED Q&A Training Tab
            </Typography>
            
            <Box sx={{ mb: 3, border: '2px solid green', p: 2, bgcolor: 'success.light' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                AI Training Session
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                Train your AI assistant through an interactive conversation.
              </Typography>
              
              <Typography variant="body1" color="info.main" sx={{ mt: 2, p: 2, bgcolor: 'info.light' }}>
                DEBUG: Expert data loaded successfully!
                <br />
                Name: {expert.name}
                <br />
                Onboarding: {expert.onboarding_completed ? 'Completed' : 'Not completed'}
                <br />
                Messages: {expert.total_training_messages || 0}
              </Typography>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', border: '2px solid blue', p: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleStartTraining}
                disabled={!expert.onboarding_completed}
                sx={{ minHeight: '50px', fontSize: '16px' }}
              >
                {!expert.onboarding_completed ? 'Complete Profile Setup First' : 
                 (expert.total_training_messages || 0) > 0 ? 'Continue Training Session' : 'Start Training Session'}
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}; 