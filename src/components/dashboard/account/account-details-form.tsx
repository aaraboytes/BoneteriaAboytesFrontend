'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';

const states = [
  { value: 'alabama', label: 'Alabama' },
  { value: 'new-york', label: 'New York' },
  { value: 'san-francisco', label: 'San Francisco' },
  { value: 'los-angeles', label: 'Los Angeles' },
] as const;

import { useUser } from '@/hooks/use-user';
import apiClient from '@/lib/api-client';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export function AccountDetailsForm(): React.JSX.Element {
  const { user, checkSession } = useUser();
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    specialty: '',
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.telephone || '',
        address: user.address || '',
        specialty: user.specialty || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setShowSuccess(false);

    try {
      await apiClient.put('/Auth/me', {
        fullName: formData.fullName,
        email: formData.email,
        telephone: formData.phone,
        address: formData.address,
        specialty: formData.specialty
      });
      
      await checkSession?.();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
     return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader subheader="The information can be edited" title="Profile" />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ md: 12, xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Full Name</InputLabel>
                <OutlinedInput 
                  value={formData.fullName} 
                  onChange={handleChange}
                  label="Full Name" 
                  name="fullName" 
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Email address</InputLabel>
                <OutlinedInput 
                  value={formData.email} 
                  onChange={handleChange}
                  label="Email address" 
                  name="email" 
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Phone number</InputLabel>
                <OutlinedInput 
                  value={formData.phone} 
                  onChange={handleChange}
                  label="Phone number" 
                  name="phone" 
                  type="tel" 
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Specialty</InputLabel>
                <OutlinedInput 
                  value={formData.specialty} 
                  onChange={handleChange}
                  label="Specialty" 
                  name="specialty" 
                />
              </FormControl>
            </Grid>
            <Grid size={{ md: 6, xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Address</InputLabel>
                <OutlinedInput 
                  value={formData.address} 
                  onChange={handleChange}
                  label="Address" 
                  name="address" 
                />
              </FormControl>
            </Grid>
          </Grid>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {showSuccess && <Alert severity="success" sx={{ mt: 2 }}>Profile updated successfully!</Alert>}
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save details'}
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
