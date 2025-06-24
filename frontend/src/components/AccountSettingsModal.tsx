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
  IconButton,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { authApi, expertApi, userApi } from '../services/api';

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  isExpert?: boolean; // New prop to distinguish between user and expert modals
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  open,
  onClose,
  currentEmail,
  isExpert = false
}) => {
  const [emailData, setEmailData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

    if (!emailData.currentPassword) {
      setError('Current password is required to change your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.changeEmail(emailData.newEmail, emailData.currentPassword);
      setSuccess(`Verification email sent to ${emailData.newEmail}. Please check your email and click the verification link to complete the email change.`);
      setEmailData({ newEmail: '', confirmEmail: '', currentPassword: '' });
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

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      setError(null);
      
      if (isExpert) {
        await expertApi.deleteProfile();
      } else {
        await userApi.deleteProfile();
      }
      
      // Clear local storage
      localStorage.clear();
      
      // Close modals and redirect to home page
      setShowDeleteDialog(false);
      onClose();
      window.location.href = '/';
      
    } catch (err: any) {
      console.error('Failed to delete profile:', err);
      setError('Failed to delete profile. Please try again.');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleClose = () => {
    setEmailData({ newEmail: '', confirmEmail: '', currentPassword: '' });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Account Settings</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
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

            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={emailData.currentPassword}
              onChange={(e) => setEmailData({ ...emailData, currentPassword: e.target.value })}
              margin="normal"
              disabled={loading}
              helperText="Password is required for security when changing your email address"
            />

            <Button
              variant="outlined"
              onClick={handleEmailChange}
              disabled={loading || !emailData.newEmail || !emailData.confirmEmail || !emailData.currentPassword}
              sx={{ mt: 1 }}
            >
              Update Email
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Change Password Section */}
          <Box sx={{ mb: 4 }}>
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

          <Divider sx={{ my: 3 }} />

          {/* Delete Profile Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Danger Zone
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Deleting your profile will permanently remove all your data and cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteDialog(true)}
              disabled={loading}
            >
              Delete Profile
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="error">
          Delete Profile
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete your profile? This action cannot be undone and will:
          </Typography>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Permanently delete all your profile data
            </Typography>
            {isExpert && (
              <>
                <Typography component="li" variant="body2" color="text.secondary">
                  Remove all your training messages and AI knowledge
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Delete your expert account completely
                </Typography>
              </>
            )}
            {!isExpert && (
              <>
                <Typography component="li" variant="body2" color="text.secondary">
                  Your account history
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  All associated data
                </Typography>
              </>
            )}
          </Box>
          <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>
            This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProfile}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 