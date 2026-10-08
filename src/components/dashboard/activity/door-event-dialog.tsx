'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Door, DoorOpen } from '@phosphor-icons/react';

import apiClient from '@/lib/api-client';

export interface DoorEventData {
  id: number;
  cameraId: number;
  cameraName: string;
  storeName: string | null;
  timestamp: string;
  confidence: number;
  personDetected: boolean;
  hasSnapshot: boolean;
}

interface DoorEventDialogProps {
  open: boolean;
  opened: boolean;
  data: DoorEventData | null;
  onClose: () => void;
}

export function DoorEventDialog({ open, opened, data, onClose }: DoorEventDialogProps): React.JSX.Element | null {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const eventId = data?.id;
  const hasSnapshot = data?.hasSnapshot ?? false;

  React.useEffect(() => {
    if (!open || eventId === undefined || !hasSnapshot) return undefined;
    let cancelled = false;
    let url: string | null = null;
    apiClient
      .get<Blob>(`/Cameras/events/${eventId}/snapshot`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        url = URL.createObjectURL(res.data);
        setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setImageUrl(null);
    };
  }, [open, eventId, hasSnapshot]);

  if (!data) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ p: 1, borderRadius: '50%', bgcolor: opened ? 'warning.main' : 'success.main', color: 'common.white', display: 'flex' }}>
          {opened ? <DoorOpen size={24} weight="bold" /> : <Door size={24} weight="bold" />}
        </Box>
        <Typography variant="h6" component="span">
          La puerta de la cámara {data.cameraName} se ha {opened ? 'abierto' : 'cerrado'}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={new Date(data.timestamp).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'medium' })} />
            {data.storeName ? <Chip size="small" variant="outlined" label={data.storeName} /> : null}
            <Chip
              size="small"
              color={data.personDetected ? 'info' : 'default'}
              variant={data.personDetected ? 'filled' : 'outlined'}
              label={data.personDetected ? 'Persona detectada cerca' : 'Sin persona detectada'}
            />
          </Stack>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL, not optimizable by next/image
            <img src={imageUrl} alt="Imagen del momento del evento" style={{ width: '100%', borderRadius: 8 }} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {data.hasSnapshot ? 'Cargando imagen…' : 'Este evento no tiene imagen.'}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
