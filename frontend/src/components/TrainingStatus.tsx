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
  
  // Use useAuth hook with proper error handling
  const auth = useAuth();
  const expert = auth?.expert || null;

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
            <Typography variant="h6" color="primary" gutterBottom>
              AI Training Session
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Train your AI assistant through an interactive conversation. The AI will ask you questions about your expertise, and your responses will teach it to think and respond like you.
            </Typography>
            
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                How it works:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • The AI asks targeted questions about your field and experience
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • You provide detailed answers sharing your knowledge and approach
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • The AI learns from your responses to better represent your expertise
              </Typography>
              <Typography variant="body2">
                • Takes about 10-15 minutes and can be paused anytime
              </Typography>
            </Box>
            
            {(expert.total_training_messages || 0) > 0 ? (
              <Typography color="info.main" sx={{ mt: 2 }}>
                In Progress - {expert.total_training_messages || 0} training messages exchanged
                {expert.last_training_at && (
                  <span> (Last session: {new Date(expert.last_training_at).toLocaleDateString()})</span>
                )}
              </Typography>
            ) : expert.onboarding_completed ? (
              <Typography color="success.main" sx={{ mt: 2 }}>
                Ready to start your first training session
              </Typography>
            ) : (
              <Typography color="warning.main" sx={{ mt: 2 }}>
                Complete your expert profile first to begin training
              </Typography>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
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