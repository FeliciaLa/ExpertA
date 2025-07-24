import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { Payment, CreditCard, Lock, CheckCircle, Rocket } from '@mui/icons-material';
import { STRIPE_PUBLISHABLE_KEY } from '../utils/environment';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ExpertActivationPaymentProps {
  onPaymentSuccess?: () => void;
  onClose?: () => void;
}

const ACTIVATION_FEATURES = [
  'Make your AI expert publicly shareable',
  '200 user interactions included',
  'Analytics dashboard to track engagement', 
  'Embed anywhere (website, social media)',
  'Custom shareable link',
  'No monthly fees - one-time payment'
];

export const ExpertActivationPayment: React.FC<ExpertActivationPaymentProps> = ({
  onPaymentSuccess,
  onClose
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);
  
  const { user, expert } = useAuth();
  const activationPrice = 9.99;

  // Initialize Stripe when payment dialog opens
  useEffect(() => {
    if (showPaymentDialog && !stripe) {
      const stripeInstance = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
      setStripe(stripeInstance);
      
      if (stripeInstance) {
        const elementsInstance = stripeInstance.elements();
        
        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
              fontSmoothing: 'antialiased',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#fa755a',
              iconColor: '#fa755a'
            }
          },
        });
        
        setCardElement(cardElementInstance);
      }
    }
  }, [showPaymentDialog]);

  // Mount card element
  useEffect(() => {
    if (cardElement && cardElementRef.current) {
      cardElement.mount(cardElementRef.current);
      
      return () => {
        if (cardElement) {
          cardElement.unmount();
        }
      };
    }
  }, [cardElement]);

  const handleActivate = () => {
    setShowPaymentDialog(true);
    setError(null);
  };

  const handlePaymentSubmit = async () => {
    if (!stripe || !cardElement) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use existing payment system - create payment intent for expert activation  
      const response = await api.post('payment/create-intent/', {
        expert_id: expert?.id || user?.id, // Use expert's own ID for activation
        activation_payment: true, // Flag to indicate this is an activation payment
        amount: activationPrice // £9.99 for activation
      });

      const { client_secret, payment_intent_id } = response.data;

      // Confirm payment with Stripe using existing flow
      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: expert?.name || user?.name,
            email: expert?.email || user?.email,
          },
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Use existing confirmation endpoint
        await api.post('payment/confirm/', {
          payment_intent_id: payment_intent_id,
          expert_id: expert?.id || user?.id,
          activation_payment: true
        });

        setShowPaymentDialog(false);
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }

    } catch (err: any) {
      console.error('Activation payment error:', err);
      setError(err.response?.data?.error || err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setShowPaymentDialog(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <Box>
      {/* Activation Overview */}
      <Typography variant="h4" gutterBottom textAlign="center" sx={{ mb: 2 }}>
        🎉 Your AI Expert is Ready!
      </Typography>
      
      <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
        Your AI expert has been trained and tested. Pay £{activationPrice} to make it live and shareable.
      </Typography>

      {/* Activation Card */}
      <Paper 
        elevation={0}
        sx={{ 
          maxWidth: 500, 
          mx: 'auto', 
          mb: 4,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          border: '2px solid rgba(102, 126, 234, 0.2)',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Rocket sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Activate Your AI Expert
          </Typography>
          
          <Typography variant="h2" component="span" fontWeight="bold" color="primary.main">
            £{activationPrice}
          </Typography>
          <Typography variant="body1" component="span" color="text.secondary">
            {' '}one-time
          </Typography>
          
          <Typography variant="body2" color="success.main" sx={{ mt: 1, mb: 3 }}>
            Includes 200 user interactions • No monthly fees
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="left">
            {ACTIVATION_FEATURES.map((feature, index) => (
              <Box key={index} display="flex" alignItems="center" mb={1.5}>
                <CheckCircle color="primary" sx={{ fontSize: 20, mr: 2 }} />
                <Typography variant="body2">{feature}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Paper>

      <Box textAlign="center">
        <Button
          variant="contained"
          size="large"
          onClick={handleActivate}
          startIcon={<Payment />}
          sx={{ 
            px: 6, 
            py: 2, 
            fontSize: '1.2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            }
          }}
        >
          Activate for £{activationPrice}
        </Button>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          🔒 Secure payment powered by Stripe
        </Typography>
      </Box>

      {/* Payment Dialog */}
      <Dialog 
        open={showPaymentDialog} 
        onClose={handleClose}
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Lock color="primary" />
            <Typography variant="h6">Secure Payment</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Payment Summary */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              AI Expert Activation
            </Typography>
            <Typography variant="h4" color="primary" gutterBottom>
              £{activationPrice}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              One-time payment • 200 interactions included
            </Typography>
          </Paper>

          {/* Card Input */}
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Payment Details
          </Typography>
          <Box 
            ref={cardElementRef}
            sx={{ 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              mb: 2,
              '&:focus-within': {
                borderColor: '#1976d2',
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)'
              }
            }}
          />

          <Box display="flex" alignItems="center" gap={1} mt={2}>
            <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Your payment information is encrypted and secure
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePaymentSubmit}
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <CreditCard />}
            sx={{ minWidth: 140 }}
          >
            {isProcessing ? 'Processing...' : `Pay £${activationPrice}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpertActivationPayment; 