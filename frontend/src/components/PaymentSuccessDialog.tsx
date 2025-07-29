import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface PaymentSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expertName: string;
  sessionDuration: number; // in minutes
  amountPaid: number;
}

const PaymentSuccessDialog: React.FC<PaymentSuccessDialogProps> = ({
  isOpen,
  onClose,
  expertName,
  sessionDuration,
  amountPaid
}) => {
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 2 }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" component="div" gutterBottom>
          Payment Successful!
        </Typography>
        <Chip
          label={`${sessionDuration}-Minute Session Active`}
          color="success"
          sx={{ fontWeight: 'bold' }}
        />
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
        <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Session Details
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <span>Duration:</span>
            <span>{sessionDuration} minutes</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <span>Expert:</span>
            <span>{expertName}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <span>Amount Paid:</span>
            <span>£{amountPaid.toFixed(2)}</span>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary">
          Your consultation session with {expertName} is now active. 
          You can ask unlimited questions during your session.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          size="large"
          sx={{ px: 4, borderRadius: 2 }}
        >
          Start Chatting
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentSuccessDialog; 