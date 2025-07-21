import React, { useState, useEffect, useRef } from 'react';
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
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();

  // Only render if payments feature is enabled (staging/dev only)
  if (!features.payments) {
    return null;
  }

  // Initialize Stripe Elements when dialog opens
  useEffect(() => {
    if (showPaymentDialog && !stripe) {
      const stripeInstance = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      
      if (stripeInstance) {
        const elementsInstance = stripeInstance.elements();
        setElements(elementsInstance);
        
        // Create card element
        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
          },
        });
        
        setCardElement(cardElementInstance);
      }
    }
  }, [showPaymentDialog]);

  // Mount card element when it's ready
  useEffect(() => {
    if (cardElement && cardElementRef.current) {
      cardElement.mount(cardElementRef.current);
      
      return () => {
        cardElement.unmount();
      };
    }
  }, [cardElement]);

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
    if (!paymentData || !stripe || !cardElement) {
      setError('Payment system not ready. Please try again.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Processing payment with Stripe Elements...');
      
      // Create payment method using Stripe Elements
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
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
        setStripe(null);
        setElements(null);
        setCardElement(null);
        
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
      <Dialog 
        open={showPaymentDialog} 
        onClose={() => {
          if (!isProcessing) {
            setShowPaymentDialog(false);
            setStripe(null);
            setElements(null);
            setCardElement(null);
          }
        }} 
        maxWidth="sm" 
        fullWidth
      >
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
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Card Details
              </Typography>
              <Box
                ref={cardElementRef}
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  padding: 2,
                  minHeight: '40px',
                  backgroundColor: isProcessing ? '#f5f5f5' : 'white',
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowPaymentDialog(false);
              setStripe(null);
              setElements(null);
              setCardElement(null);
            }} 
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePaymentSubmit} 
            variant="contained" 
            disabled={isProcessing || !cardElement}
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