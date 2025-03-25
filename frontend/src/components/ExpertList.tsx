import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Expert {
  id: string;
  name: string;
  specialties: string;
  bio: string;
  email: string;
}

export const ExpertList: React.FC = () => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/experts/');
        console.log('API Response:', response);
        console.log('Experts data:', response.data);
        setExperts(response.data);
      } catch (error) {
        console.error('Failed to fetch experts:', error);
        setError('Failed to load experts');
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  const filteredExperts = experts.filter(expert =>
    expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expert.specialties?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4, color: 'primary.main' }}>
        Find an Expert
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or specialty..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3}>
        {filteredExperts.map((expert) => (
          <Grid item xs={12} sm={6} md={4} key={expert.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': { boxShadow: 6 }
              }}
              onClick={() => navigate(`/experts/${expert.id}`)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      bgcolor: 'primary.main',
                      mr: 2 
                    }}
                  >
                    {expert.name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {expert.name}
                    </Typography>
                    {expert.specialties?.split(',').map((specialty, index) => (
                      <Chip 
                        key={index}
                        label={specialty.trim()}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>

                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {expert.bio}
                </Typography>

                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/experts/${expert.id}`);
                  }}
                >
                  Chat with Expert
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredExperts.length === 0 && !loading && !error && (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          No experts found matching your search criteria.
        </Typography>
      )}
    </Box>
  );
};

export default ExpertList; 