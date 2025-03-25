import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpertProfile from './ExpertProfile';
import { expertService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface KnowledgeEntry {
  id: string;
  title: string;
  preview: string;
  knowledge: string;  // Full text for editing
  created_at: string;
  creator: string;
}

export const ExpertForm: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [knowledge, setKnowledge] = useState('');
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setError('You must be logged in to submit knowledge');
      return;
    }
    loadKnowledge();
  }, [isAuthenticated]);

  const loadKnowledge = async () => {
    try {
      const data = await expertService.getKnowledge();
      setEntries(data);
    } catch (err) {
      setError('Failed to load knowledge entries');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('You must be logged in to submit knowledge');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      console.log('Current token:', token);
      await expertService.submitKnowledge(knowledge);
      setSuccess('Knowledge submitted successfully');
      setKnowledge('');
      loadKnowledge();
    } catch (err) {
      console.error('Submit knowledge error:', err);
      setError('Failed to submit knowledge');
    }
  };

  const handleEdit = async () => {
    if (!editingEntry) return;

    try {
      await expertService.updateKnowledge(editingEntry.id, editingEntry.knowledge);
      setSuccess('Knowledge updated successfully');
      setEditingEntry(null);
      loadKnowledge();
    } catch (err) {
      setError('Failed to update knowledge');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await expertService.deleteKnowledge(id);
      setSuccess('Knowledge deleted successfully');
      loadKnowledge();
    } catch (err) {
      setError('Failed to delete knowledge');
    }
  };

  return (
    <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <ExpertProfile />
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" color="primary">
          Add New Knowledge
        </Typography>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, width: '100%', mb: 3 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Enter your knowledge..."
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                }
              }}
            >
              Submit
            </Button>
          </form>
        </Paper>
      </Box>

      <Box>
        <Typography variant="h5" sx={{ mb: 3, color: '#1976d2', fontWeight: 500 }}>
          Knowledge Base
        </Typography>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Preview</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.title}</TableCell>
                  <TableCell>{entry.preview}</TableCell>
                  <TableCell>{entry.created_at}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      sx={{ mr: 1, textTransform: 'none' }}
                      onClick={() => setEditingEntry(entry)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      sx={{ textTransform: 'none' }}
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {editingEntry && (
        <Dialog 
          open={!!editingEntry} 
          onClose={() => setEditingEntry(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Knowledge Entry</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={6}
              value={editingEntry?.knowledge || ''}
              onChange={(e) =>
                setEditingEntry(
                  editingEntry
                    ? { ...editingEntry, knowledge: e.target.value }
                    : null
                )
              }
              margin="normal"
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button onClick={handleEdit} variant="contained" color="primary">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  ); 
}; 