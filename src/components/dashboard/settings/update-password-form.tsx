'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import apiClient from '@/lib/api-client';

export function UpdatePasswordForm(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      await apiClient.put('/Auth/password', {
        currentPassword,
        newPassword: password
      });
      
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = err as any;
      setMessage({ type: 'error', text: error.response?.data || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader subheader="Update password" title="Password" />
        <Divider />
        <CardContent>
          <Stack spacing={3} sx={{ maxWidth: 'sm' }}>
            {message && (
              <Alert severity={message.type}>{message.text}</Alert>
            )}
            <FormControl fullWidth>
              <InputLabel>Current password</InputLabel>
              <OutlinedInput 
                label="Current password" 
                name="currentPassword" 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>New password</InputLabel>
              <OutlinedInput 
                label="New password" 
                name="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Confirm new password</InputLabel>
              <OutlinedInput 
                label="Confirm new password" 
                name="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormControl>
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button disabled={loading} type="submit" variant="contained">
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Update'}
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
