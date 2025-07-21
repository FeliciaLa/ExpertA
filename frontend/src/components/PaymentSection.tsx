import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { Payment, CreditCard, Lock } from '@mui/icons-material';
import { features, getEnvironment, STRIPE_PUBLISHABLE_KEY } from '../utils/environment';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PaymentSectionProps {
  expertId: string;
  expertName?: string;
  price?: number;
  onPaymentSuccess?: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  expertId,
  expertName = "Expert", 
  price = 29.99,
  onPaymentSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });
  
  const { user } = useAuth();

  // Only render if payments feature is enabled (staging/dev only)
  if (!features.payments) {
    return null;
  }

  const handlePaymentClick = async () => {
    if (!user) {
      setError('Please sign in to make a payment');
      return;
    }
    
    setShowPaymentDialog(true);
    setError(null);
    
    try {
      // Create payment intent
      const response = await api.post('payment/create-intent/', {
        expert_id: expertId
      });
      
      setPaymentData(response.data);
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.response?.data?.error || 'Failed to initialize payment');
      setShowPaymentDialog(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Processing payment with Stripe...');
      
      // Initialize Stripe with environment variable
      const stripe = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }
      
      // Validate card details before processing
      const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
      const expiryParts = cardDetails.expiryDate.split('/');
      
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        throw new Error('Please enter a valid card number');
      }
      
      if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
        throw new Error('Please enter a valid expiry date (MM/YY)');
      }
      
      const expMonth = parseInt(expiryParts[0]);
      const expYear = parseInt('20' + expiryParts[1]);
      
      if (expMonth < 1 || expMonth > 12) {
        throw new Error('Please enter a valid expiry month');
      }
      
      if (cardDetails.cvv.length < 3 || cardDetails.cvv.length > 4) {
        throw new Error('Please enter a valid CVV');
      }
      
      if (!cardDetails.nameOnCard.trim()) {
        throw new Error('Please enter the name on card');
      }
      
      // Create a payment method using the card details
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cardDetails.cvv,
        },
        billing_details: {
          name: cardDetails.nameOnCard.trim(),
        },
      });
      
      if (pmError) {
        throw new Error(pmError.message || 'Invalid card details');
      }
      
      // Confirm the payment intent
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.client_secret,
        {
          payment_method: paymentMethod.id,
        }
      );
      
      if (confirmError) {
        throw new Error(confirmError.message || 'Payment failed');
      }
      
      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment succeeded, confirming with backend...');
        
        // Confirm payment on backend
        const confirmResponse = await api.post('payment/confirm/', {
          payment_intent_id: paymentData.payment_intent_id,
          expert_id: expertId
        });
        
        console.log('✅ Backend confirmation successful:', confirmResponse.data);
        
        setShowPaymentDialog(false);
        setCardDetails({ cardNumber: '', expiryDate: '', cvv: '', nameOnCard: '' });
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        alert('Payment successful! Your consultation session is now active.');
      } else {
        throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
      }
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <>
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
            onClick={handlePaymentClick}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => !isProcessing && setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock color="primary" />
            Secure Payment
          </Box>
        </DialogTitle>
        <DialogContent>
          {paymentData && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Payment Summary</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Expert fee:</Typography>
                <Typography>£{paymentData.expert_amount?.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Platform fee:</Typography>
                <Typography>£{paymentData.platform_amount?.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: 1, borderColor: 'divider', pt: 1 }}>
                <Typography>Total:</Typography>
                <Typography>£{paymentData.amount?.toFixed(2)}</Typography>
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Card Number"
              value={cardDetails.cardNumber}
              onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
              placeholder="4242 4242 4242 4242"
              disabled={isProcessing}
              inputProps={{ maxLength: 19 }}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Expiry Date"
                value={cardDetails.expiryDate}
                onChange={(e) => setCardDetails(prev => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))}
                placeholder="MM/YY"
                disabled={isProcessing}
                inputProps={{ maxLength: 5 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="CVV"
                value={cardDetails.cvv}
                onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                placeholder="123"
                disabled={isProcessing}
                inputProps={{ maxLength: 4 }}
                sx={{ flex: 1 }}
              />
            </Box>
            
            <TextField
              label="Name on Card"
              value={cardDetails.nameOnCard}
              onChange={(e) => setCardDetails(prev => ({ ...prev, nameOnCard: e.target.value }))}
              placeholder="John Doe"
              disabled={isProcessing}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handlePaymentSubmit} 
            variant="contained" 
            disabled={isProcessing || !cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.nameOnCard}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <Lock />}
          >
            {isProcessing ? 'Processing...' : `Pay £${paymentData?.amount?.toFixed(2) || price}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentSection; 