import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

export const KnowledgeInput: React.FC = () => {
  const [knowledge, setKnowledge] = useState('');
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (!knowledge.trim()) return;

    try {
      setLoading(true);
      await axios.post('/api/knowledge/', { knowledge: knowledge.trim() });
      setKnowledge('');
      enqueueSnackbar('Knowledge submitted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to submit knowledge', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Add Knowledge
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" gutterBottom>
          Share your expertise by adding knowledge entries. This can be facts, experiences, or insights in your field.
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          placeholder="Type your knowledge here..."
          sx={{ mt: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!knowledge.trim() || loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Knowledge'}
        </Button>
      </Paper>
    </Box>
  );
}; 