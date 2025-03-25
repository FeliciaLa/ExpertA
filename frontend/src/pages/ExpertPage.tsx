import React from 'react';
import { Container } from '@mui/material';
import ExpertProfile from '../components/ExpertProfile';
import { ExpertForm } from '../components/ExpertForm';

const ExpertPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <ExpertProfile />
      <ExpertForm />
    </Container>
  );
};

export default ExpertPage; 