import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
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
  const { expert } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const getStepStatus = () => {
    if (!expert) return 'not_started';
    
    if (!expert.onboarding_completed) return 'not_started';
    return expert.total_training_messages > 0 ? 'in_progress' : 'not_started';
  };

  const handleStartTraining = () => {
    if (!expert?.onboarding_completed) {
      // If profile is not completed, redirect to expert profile
      navigate('/expert');
    } else {
      // If profile is completed, go to training chat
      navigate('/train/chat');
    }
  };

  if (!expert) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
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
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                AI Training Session
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                Teach the AI by answering focused questions about your field. The AI will learn from your insights to better replicate your expertise.
              </Typography>
              {expert.total_training_messages > 0 ? (
                <Typography color="info.main" sx={{ mt: 2 }}>
                  In Progress - {expert.total_training_messages} training messages exchanged
                  {expert.last_training_at && (
                    <span> (Last session: {new Date(expert.last_training_at).toLocaleDateString()})</span>
                  )}
                </Typography>
              ) : expert.onboarding_completed ? (
                <Box sx={{ mt: 2 }}></Box>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Ready to start - Complete profile setup first
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleStartTraining}
              >
                {!expert.onboarding_completed ? 'Complete Profile Setup First' : 'Continue to Training'}
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}; 