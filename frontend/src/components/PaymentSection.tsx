import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Chip } from '@mui/material';
import { Payment, CreditCard } from '@mui/icons-material';
import { features, getEnvironment } from '../utils/environment';

interface PaymentSectionProps {
  expertName?: string;
  price?: number;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  expertName = "Expert", 
  price = 29.99 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Only render if payments feature is enabled (staging/dev only)
  if (!features.payments) {
    return null;
  }

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // TODO: Implement Stripe payment flow
      console.log('Processing payment for:', { expertName, price });
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Payment successful! (This is a test payment)');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card sx={{ mt: 3, border: '2px dashed orange' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Payment color="primary" />
          <Typography variant="h6" color="primary">
            Payment System
          </Typography>
          <Chip 
            label={`${getEnvironment().toUpperCase()} ONLY`} 
            color="warning" 
            size="small" 
          />
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>🚧 Development Feature</strong> - This payment system is only visible on staging/development environments. 
          Uses Stripe test mode - no real charges will be made.
        </Alert>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1">
            Consultation with <strong>{expertName}</strong>
          </Typography>
          <Typography variant="h6" color="primary">
            £{price}
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          startIcon={<CreditCard />}
          onClick={handlePayment}
          disabled={isProcessing}
          sx={{ py: 1.5 }}
        >
          {isProcessing ? 'Processing...' : `Pay £${price}`}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          💳 Test Mode - Use card 4242 4242 4242 4242
        </Typography>
      </CardContent>
    </Card>
  );
};

export default PaymentSection; 