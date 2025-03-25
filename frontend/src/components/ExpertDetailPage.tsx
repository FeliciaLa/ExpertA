import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  Chip,
  Divider,
  Button,
  Container
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import api from '../services/api';

interface ExpertDetail {
  id: string;
  name: string;
  email: string;
  specialties: string;
  bio: string;
}

export const ExpertDetailPage: React.FC = () => {
  const { expertId } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState<ExpertDetail | null>(null);

  useEffect(() => {
    const fetchExpertDetails = async () => {
      try {
        const response = await api.get(`/api/experts/${expertId}/`);
        setExpert(response.data);
      } catch (error) {
        console.error('Failed to fetch expert details:', error);
      }
    };

    fetchExpertDetails();
  }, [expertId]);

  if (!expert) {
    return <Box sx={{ p: 3 }}>Loading...</Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        onClick={() => navigate('/experts')}
        sx={{ mb: 3 }}
      >
        ← Back to Experts
      </Button>
      
      <Grid container spacing={4}>
        {/* Expert Profile Section */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  mr: 2
                }}
              >
                {expert.name[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {expert.name}
                </Typography>
                <Typography color="textSecondary">
                  {expert.email}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Specialties
            </Typography>
            <Box sx={{ mb: 2 }}>
              {expert.specialties?.split(',').map((specialty, index) => (
                <Chip
                  key={index}
                  label={specialty.trim()}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>

            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Typography paragraph>
              {expert.bio || 'No bio available'}
            </Typography>
          </Paper>
        </Grid>

        {/* Chat Section */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Chat expertId={expert.id} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExpertDetailPage; 