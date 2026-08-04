'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useUser } from '@/hooks/use-user';
import apiClient from '@/lib/api-client';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export function AccountInfo(): React.JSX.Element {
  const { user, checkSession } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await apiClient.post('/Auth/me/avatar', { avatarData: base64String });
        await checkSession?.();
      } catch (error) {
        console.error('Failed to upload avatar', error);
        alert('Failed to upload picture');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <Card sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <div>
            <Avatar src={user.avatarUrl} sx={{ height: '80px', width: '80px' }} />
          </div>
          <Stack spacing={1} sx={{ textAlign: 'center' }}>
            <Typography variant="h5">{user.fullName}</Typography>
            <Typography color="text.secondary" variant="body2">
              {user.specialty || 'General'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {user.email}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
      <Divider />
      <CardActions>
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button 
          fullWidth 
          variant="text" 
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? <CircularProgress size={24} /> : 'Upload picture'}
        </Button>
      </CardActions>
    </Card>
  );
}
