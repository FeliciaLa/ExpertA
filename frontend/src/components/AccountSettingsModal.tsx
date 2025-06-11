import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { authApi } from '../services/api';

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onClose,
  currentEmail
}) => {
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = async () => {
    if (emailData.newEmail !== emailData.confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (!emailData.newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.changeEmail(emailData.newEmail);
      setSuccess('Email change request sent! Please check your email to confirm.');
      setEmailData({ newEmail: '', confirmEmail: '' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!passwordData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmailData({ newEmail: '', confirmEmail: '' });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Account Settings</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Current Email Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Current Email
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {currentEmail}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Change Email Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Change Email Address
          </Typography>
          
          <TextField
            fullWidth
            label="New Email Address"
            type="email"
            value={emailData.newEmail}
            onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
            margin="normal"
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="Confirm New Email"
            type="email"
            value={emailData.confirmEmail}
            onChange={(e) => setEmailData({ ...emailData, confirmEmail: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <Button
            variant="outlined"
            onClick={handleEmailChange}
            disabled={loading || !emailData.newEmail || !emailData.confirmEmail}
            sx={{ mt: 1 }}
          >
            Update Email
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Change Password Section */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>

          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            margin="normal"
            disabled={loading}
            helperText="Password must be at least 8 characters long"
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            margin="normal"
            disabled={loading}
          />

          <Button
            variant="outlined"
            onClick={handlePasswordChange}
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            sx={{ mt: 1 }}
          >
            Update Password
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 