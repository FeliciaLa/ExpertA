import React from 'react';
import { Box, Typography } from '@mui/material';

export const TrainingChat: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Q&A Training - Test Version
      </Typography>
      <Typography variant="body1">
        This is a minimal test version to isolate the JavaScript error.
        If you can see this text, the component is rendering successfully.
      </Typography>
    </Box>
  );
}; 