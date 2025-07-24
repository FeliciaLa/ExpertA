import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Button, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Paper, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel } from '@mui/material';
import { Payment, CreditCard, Lock } from '@mui/icons-material';
import { features, getEnvironment, STRIPE_PUBLISHABLE_KEY } from '../utils/environment';
import api, { paymentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PaymentSectionProps {
  expertId: string;
  expertName?: string;
  price?: number;
  onPaymentSuccess?: () => void;
}

interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
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
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new');
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  
  const { user } = useAuth();

  // Only render if payments feature is enabled (staging/dev only)
  if (!features.payments) {
    return null;
  }

  // Load saved payment methods
  const loadSavedPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await paymentService.getSavedPaymentMethods();
      setSavedPaymentMethods(response.payment_methods || []);
    } catch (error) {
      console.error('Failed to load saved payment methods:', error);
      setSavedPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Initialize Stripe Elements and load payment methods when dialog opens
  useEffect(() => {
    if (showPaymentDialog) {
      // Load saved payment methods
      loadSavedPaymentMethods();
      
      // Initialize Stripe if not already done
      if (!stripe) {
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
    if (!paymentData || !stripe) {
      setError('Payment system not ready. Please try again.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Processing payment...');
      
      let paymentMethodId: string;
      
      if (selectedPaymentMethod === 'new') {
        // Create new payment method using Stripe Elements
        if (!cardElement) {
          throw new Error('Card element not ready. Please try again.');
        }
        
        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
        });
        
        if (pmError) {
          throw new Error(pmError.message || 'Invalid card details');
        }
        
        paymentMethodId = paymentMethod.id;
        console.log('✅ New payment method created:', paymentMethodId);
      } else {
        // Use saved payment method
        paymentMethodId = selectedPaymentMethod;
        console.log('✅ Using saved payment method:', paymentMethodId);
      }
      
      // Confirm the payment intent with the payment method
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.client_secret,
        {
          payment_method: paymentMethodId,
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
        setSelectedPaymentMethod('new'); // Reset selection
      
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
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Payment color="primary" />
            <Typography variant="h6" color="primary">
              Secure Payment
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>💳 Secure Payment</strong> - Powered by Stripe. Your payment information is encrypted and secure.
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
            🔒 Secured by Stripe - Industry-leading payment security
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
            {/* Payment Method Selection */}
            {loadingPaymentMethods ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography>Loading saved payment methods...</Typography>
              </Box>
            ) : (
              <FormControl component="fieldset">
                <FormLabel component="legend">Payment Method</FormLabel>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                >
                  {savedPaymentMethods.map((method) => (
                    <FormControlLabel
                      key={method.id}
                      value={method.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CreditCard fontSize="small" />
                          <Typography>
                            {method.brand.toUpperCase()} •••• {method.last4}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                  <FormControlLabel
                    value="new"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CreditCard fontSize="small" />
                        <Typography>Add new payment method</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            )}

            {/* Card Details Input (only show if "new" is selected) */}
            {selectedPaymentMethod === 'new' && (
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
            )}
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
            disabled={isProcessing || (selectedPaymentMethod === 'new' && !cardElement)}
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