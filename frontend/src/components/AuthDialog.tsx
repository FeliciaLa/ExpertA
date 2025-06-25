import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  TextField,
  DialogActions,
  Button,
  Link,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ForgotPasswordDialog from './ForgotPasswordDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string, isExpertLogin: boolean) => Promise<{ success: boolean; message?: string }>;
  onRegister: (name: string, email: string, password: string, isExpertRegistration: boolean, userRole?: 'user' | 'expert') => Promise<{ success: boolean; message?: string }>;
  expertRegisterOnly?: boolean;
}

const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onClose,
  onSignIn,
  onRegister,
  expertRegisterOnly = false,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'expert'>('expert');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (open) {
      // If expertRegisterOnly is true, force the register tab and expert role
      if (expertRegisterOnly) {
        setTabValue(1);
        setUserRole('expert');
      } else {
        // Otherwise check localStorage for initial tab value
        const initialTab = localStorage.getItem('authInitialTab');
        if (initialTab) {
          setTabValue(parseInt(initialTab, 10));
          // Clear the value after using it
          localStorage.removeItem('authInitialTab');
        }
        // Default to expert role for general registration
        setUserRole('expert');
      }
    } else {
      // Reset form when dialog closes
      resetForm();
    }
  }, [open, expertRegisterOnly]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUserRole('expert');
    setError('');
    setIsSubmitting(false);
    setSuccessMessage(null);
    setShowForgotPassword(false);
    setAcceptTerms(false);
  };

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
      // We pass false for isExpertLogin - the backend will determine the role
      const result = await onSignIn(email, password, false);
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
      setError('Please fill in all fields');
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

    if (!acceptTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to register');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessMessage('');
      // Use the selected role or expertRegisterOnly prop to determine registration type
      const isExpertRegistration = expertRegisterOnly || userRole === 'expert';
      const result = await onRegister(name, email, password, isExpertRegistration, userRole);
      if (result.success) {
        // Instead of closing immediately, show success message
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Show success message about verification email
        setSuccessMessage('Registration successful! Please check your email to verify your account.');
        
        // Don't close dialog immediately so user can see the message
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 5000);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null) {
        // Try to extract more details if available
        const errorObj = err as any;
        if (errorObj.response?.data?.error) {
          setError(errorObj.response.data.error);
        } else {
          setError('Registration failed: ' + JSON.stringify(err));
        }
      } else {
        setError('Registration failed with an unknown error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {expertRegisterOnly ? 'Expert Registration' : 'Account'}
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {!expertRegisterOnly && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
              <Tab label="Sign In" id="auth-tab-0" aria-controls="auth-tabpanel-0" />
              <Tab label="Register" id="auth-tab-1" aria-controls="auth-tabpanel-1" />
            </Tabs>
          </Box>
        )}

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

        {!expertRegisterOnly && (
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
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowForgotPassword(true);
                    }}
                    disabled={isSubmitting}
                    sx={{ textDecoration: 'none' }}
                  >
                    Forgot your password?
                  </Link>
                </Box>
                
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
              </Box>
            </form>
          </TabPanel>
        )}

        <TabPanel value={expertRegisterOnly ? 0 : tabValue} index={expertRegisterOnly ? 0 : 1}>
          <form onSubmit={handleRegister}>
            <Box display="flex" flexDirection="column" gap={3}>
              {!expertRegisterOnly && (
                <FormControl component="fieldset" sx={{ mb: 1 }}>
                  <FormLabel component="legend" sx={{ mb: 1 }}>
                    I want to register as:
                  </FormLabel>
                  <RadioGroup
                    row
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as 'user' | 'expert')}
                  >
                    <FormControlLabel 
                      value="expert" 
                      control={<Radio disabled={isSubmitting} />} 
                      label="Expert"
                      disabled={isSubmitting}
                    />
                    <FormControlLabel 
                      value="user" 
                      control={<Radio disabled={isSubmitting} />} 
                      label="User"
                      disabled={isSubmitting}
                    />
                  </RadioGroup>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                    {userRole === 'expert' 
                      ? 'Train your AI expert and share your expertise with others'
                      : 'Browse and chat with expert AI assistants to get help with your questions'
                    }
                  </Typography>
                </FormControl>
              )}
              
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
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    disabled={isSubmitting}
                  />
                }
                label={
                  <Typography variant="body2">
                    I accept the{' '}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('/terms', '_blank');
                      }}
                      sx={{ textDecoration: 'underline' }}
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('/privacy', '_blank');
                      }}
                      sx={{ textDecoration: 'underline' }}
                    >
                      Privacy Policy
                    </Link>
                  </Typography>
                }
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
      
      <ForgotPasswordDialog
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </Dialog>
  );
};

export default AuthDialog; 