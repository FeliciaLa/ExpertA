import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { trainingService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface TrainingSession {
  id: string;
  field_of_knowledge: string;
  is_completed: boolean;
  created_at: string;
  expert_name: string;
}

export const TrainingSessionList: React.FC = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [fieldOfKnowledge, setFieldOfKnowledge] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await trainingService.getSessions();
      setSessions(data);
    } catch (err) {
      setError('Failed to load training sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!fieldOfKnowledge.trim()) return;

    try {
      setCreating(true);
      const session = await trainingService.startSession(fieldOfKnowledge);
      setSessions([session, ...sessions]);
      setOpenDialog(false);
      setFieldOfKnowledge('');
      navigate(`/training/${session.id}`);
    } catch (err) {
      setError('Failed to create training session');
      console.error('Error creating session:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleContinueSession = (sessionId: string) => {
    navigate(`/training/${sessionId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" color="primary">
          AI Training Sessions
        </Typography>
        <Button
          variant="contained"
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Start New Training
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <List>
        {sessions.map((session) => (
          <Paper
            key={session.id}
            sx={{
              mb: 2,
              '&:hover': { boxShadow: 3 },
              bgcolor: session.is_completed ? 'success.light' : 'background.paper',
            }}
          >
            <ListItem>
              <ListItemText
                primary={session.field_of_knowledge}
                secondary={`Created: ${new Date(session.created_at).toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleContinueSession(session.id)}
                  color="primary"
                >
                  <PlayArrowIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </Paper>
        ))}
      </List>

      {sessions.length === 0 && !loading && (
        <Typography textAlign="center" color="text.secondary">
          No training sessions yet. Start one by clicking the button above!
        </Typography>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Training Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Field of Knowledge"
            fullWidth
            variant="outlined"
            value={fieldOfKnowledge}
            onChange={(e) => setFieldOfKnowledge(e.target.value)}
            placeholder="e.g., Machine Learning, Web Development, Data Science"
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleStartSession}
            variant="contained"
            disabled={!fieldOfKnowledge.trim() || creating}
          >
            {creating ? <CircularProgress size={24} /> : 'Start Training'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 