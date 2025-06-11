import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  AlertTitle
} from '@mui/material';
import { DocumentUpload } from '../components/DocumentUpload';
import { TrainingChat } from '../components/TrainingChat';
import { AITrainingProgress } from '../components/AITrainingProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import InfoIcon from '@mui/icons-material/Info';

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        AI Training
      </Typography>

      {/* Welcome Explainer */}
      <Alert 
        severity="info" 
        icon={<InfoIcon />}
        sx={{ mb: 4 }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>Welcome to AI Training!</AlertTitle>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Now that your profile is set up, it's time to train your AI assistant with your expertise. 
          Start by uploading documents (PDFs, Word docs, etc.) that showcase your knowledge, 
          or use the Q&A Training to teach your AI through conversation. 
          The more you train it, the better it becomes at representing your expertise to potential clients.
        </Typography>
      </Alert>

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
          <DocumentUpload />
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <TrainingChat />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TrainingPage; 