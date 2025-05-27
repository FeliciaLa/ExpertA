import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tab,
  Tabs,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { debugLogin } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface UserAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onRegister: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UserAuthDialog: React.FC<UserAuthDialogProps> = ({
  open,
  onClose,
  onSignIn,
  onRegister,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTabValue(0);
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setIsSubmitting(false);
      setIsLoading(false);
      setSuccessMessage(null);
    }
  }, [open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const result = await onSignIn(email, password);
      if (result.success) {
        onClose();
      } else {
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onRegister(name, email, password);
      if (result?.success) {
        // Instead of auto-login, just show the success message
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        
        // Show success message about verification email
        setSuccessMessage('Registration successful! Please check your email to verify your account.');
        
        // Don't close dialog immediately so user can see the message
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 5000);
      } else if (result?.message) {
        setError(result.message);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        // Try to extract more details if available
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('Registration failed: ' + JSON.stringify(err));
        }
      } else {
        setError('Registration failed with an unknown error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Debug login handler
  const handleDebugLogin = async () => {
    setIsSubmitting(true);
    try {
      const testEmail = 'f@lu1.com';
      const testPassword = 'password123';
      
      console.log('Using debug login with test account:', testEmail);
      
      // Try debug login with test account
      const response = await debugLogin(testEmail, testPassword);
      console.log('Debug login response:', response);
      
      if (response && response.tokens) {
        // Success - call the normal sign in handler to update state
        const result = await onSignIn(testEmail, testPassword);
        if (result.success) {
          onClose();
        }
      } else {
        setError('Debug login failed - no valid tokens returned');
      }
    } catch (error) {
      console.error('Debug login error:', error);
      setError('Debug login failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          User Account
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
            <Tab label="Sign In" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
            <Tab label="Register" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
          </Tabs>
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {successMessage && (
          <Typography color="success" variant="body2" sx={{ mt: 2 }}>
            {successMessage}
          </Typography>
        )}

        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleSignIn}>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </Box>
              
              {/* Debug login button */}
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={handleDebugLogin}
                disabled={isSubmitting}
                sx={{ mt: 2 }}
              >
                Debug Login (Test Account)
              </Button>
            </Box>
          </form>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handleRegister}>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                label="Full Name"
                type="text"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                helperText="Password must be at least 8 characters long"
                error={password !== '' && password.length < 8}
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                error={confirmPassword !== '' && password !== confirmPassword}
                helperText={confirmPassword !== '' && password !== confirmPassword ? 'Passwords do not match' : ''}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registering...' : 'Register'}
                </Button>
              </Box>
            </Box>
          </form>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};

export default UserAuthDialog; 