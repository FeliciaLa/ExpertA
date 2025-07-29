import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
  Link,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ConsentModalProps {
  open: boolean;
  onConsent: (consentData: ConsentData) => Promise<void>;
  expertName: string;
  onClose?: () => void;
}

export interface ConsentData {
  terms_accepted: boolean;
  privacy_accepted: boolean;
  ai_disclaimer_accepted: boolean;
  age_confirmed: boolean;
  marketing_consent?: boolean;
  consent_version: string;
  expert_name: string;
  timestamp: string;
  ip_address?: string;
  user_agent: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  open,
  onConsent,
  expertName,
  onClose
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [consents, setConsents] = useState({
    termsAndPrivacy: false,
    aiDisclaimer: false
  });

  const handleConsentChange = (field: keyof typeof consents) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setConsents(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const allRequiredConsentsGiven = consents.termsAndPrivacy && consents.aiDisclaimer;

  const handleAccept = async () => {
    if (!allRequiredConsentsGiven) {
      setError('Please accept all required terms to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const consentData: ConsentData = {
        terms_accepted: consents.termsAndPrivacy,
        privacy_accepted: consents.termsAndPrivacy,
        ai_disclaimer_accepted: consents.aiDisclaimer,
        age_confirmed: true, // Covered by terms acceptance
        marketing_consent: false,
        consent_version: '1.0',
        expert_name: expertName,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      };

      await onConsent(consentData);
      
      // Consent storage is now handled by the parent component

    } catch (err) {
      console.error('Consent submission error:', err);
      setError('Failed to process consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div" gutterBottom>
          Welcome to {expertName}'s AI Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Before we begin, please review and accept the following terms
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={consents.termsAndPrivacy}
                onChange={handleConsentChange('termsAndPrivacy')}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Link 
                  href="/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link 
                  href="/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  Privacy Policy
                </Link>
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={consents.aiDisclaimer}
                onChange={handleConsentChange('aiDisclaimer')}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I acknowledge this chatbot is AI-powered and may generate errors or content not intended as professional advice
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={!allRequiredConsentsGiven || loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Processing...' : 'Accept & Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsentModal; 