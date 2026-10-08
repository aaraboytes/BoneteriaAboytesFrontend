'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import apiClient from '@/lib/api-client';

import { apiErrorMessage, type Camera, type StoreOption, type WebcamInfo } from './types';

interface CameraDialogProps {
  open: boolean;
  camera: Camera | null; // null = new camera
  stores: StoreOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function CameraDialog({ open, camera, stores, onClose, onSaved }: CameraDialogProps): React.JSX.Element {
  const [name, setName] = React.useState('');
  const [storeId, setStoreId] = React.useState<number | ''>('');
  const [streamUrl, setStreamUrl] = React.useState('');
  // A webcam is stored as its number ("0", "1"…) in streamUrl, which the worker opens as a USB camera.
  const [kind, setKind] = React.useState<'ip' | 'webcam'>('ip');
  const [sensitivity, setSensitivity] = React.useState(0.25);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(camera?.name ?? '');
    setStoreId(camera?.storeId ?? '');
    setStreamUrl(camera?.streamUrl ?? '');
    setKind(/^\d+$/.test(camera?.streamUrl ?? '') ? 'webcam' : 'ip');
    setSensitivity(camera?.sensitivity ?? 0.25);
    setIsActive(camera?.isActive ?? true);
    setError(null);
  }, [open, camera]);

  // Webcams the worker reported (null while loading).
  const [webcams, setWebcams] = React.useState<WebcamInfo[] | null>(null);
  React.useEffect(() => {
    if (!open || kind !== 'webcam') return;
    apiClient
      .get<{ webcams: WebcamInfo[] }>('/Cameras/webcams')
      .then((res) => {
        setWebcams(res.data.webcams);
      })
      .catch(() => {
        setWebcams([]);
      });
  }, [open, kind]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    const body = { name, storeId: storeId === '' ? null : storeId, streamUrl, sensitivity, isActive };
    try {
      if (camera) {
        await apiClient.put(`/Cameras/${camera.id}`, body);
      } else {
        await apiClient.post('/Cameras', body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar la cámara.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{camera ? 'Editar cámara' : 'Añadir cámara'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Nombre de la cámara"
            helperText='Aparece en los eventos: "La puerta de la cámara [nombre] se ha abierto".'
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            fullWidth
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            select
            label="Sucursal"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value === '' ? '' : Number(e.target.value));
            }}
            fullWidth
          >
            <MenuItem value="">Sin sucursal</MenuItem>
            {stores.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Tipo de cámara"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as 'ip' | 'webcam';
              setKind(next);
              setStreamUrl(next === 'webcam' ? '0' : '');
            }}
            fullWidth
          >
            <MenuItem value="ip">Cámara IP (RTSP / URL)</MenuItem>
            <MenuItem value="webcam">Webcam USB</MenuItem>
          </TextField>
          {kind === 'webcam' ? (
            <Stack spacing={1.5}>
              {webcams && webcams.length === 0 ? (
                <Alert severity="warning">
                  El worker de seguridad no ha reportado ninguna webcam. Verifica que el worker esté ejecutándose en la PC donde está
                  conectada la webcam (y que ningún otro programa la esté usando); la detecta al iniciar y cada 5 minutos, así que
                  reinícialo si la conectaste después.
                </Alert>
              ) : null}
              <TextField
                select
                label="Webcam"
                value={/^\d+$/.test(streamUrl) ? streamUrl : '0'}
                onChange={(e) => {
                  setStreamUrl(e.target.value);
                }}
                helperText="Webcams conectadas a la PC donde corre el worker de seguridad."
                fullWidth
              >
                {(webcams && webcams.length > 0 ? webcams : [{ index: 0, name: null, width: 0, height: 0, inUse: false }]).map((w) => (
                  <MenuItem key={w.index} value={String(w.index)}>
                    {w.name ?? `Webcam ${w.index}`}
                    {w.width ? ` · ${w.width}×${w.height}` : ''}
                    {w.inUse ? ' · en uso' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          ) : (
            <TextField
              label="Dirección del video"
              placeholder="rtsp://usuario:contraseña@192.168.1.50:554/stream1"
              helperText="URL RTSP de la cámara IP."
              value={streamUrl}
              onChange={(e) => {
                setStreamUrl(e.target.value);
              }}
              required
              fullWidth
            />
          )}
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sensibilidad: {Math.round(sensitivity * 100)}% de la zona debe cambiar
            </Typography>
            <Slider
              value={sensitivity}
              min={0.05}
              max={0.9}
              step={0.05}
              onChange={(_, v) => {
                setSensitivity(v as number);
              }}
              marks={[
                { value: 0.05, label: 'Más sensible' },
                { value: 0.9, label: 'Menos sensible' },
              ]}
              sx={{ mx: 2, width: 'calc(100% - 32px)' }}
            />
            <Typography variant="caption" color="text.secondary">
              Un valor bajo avisa con cualquier cambio en la puerta; uno alto solo cuando está muy abierta.
            </Typography>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => {
                  setIsActive(e.target.checked);
                }}
              />
            }
            label="Cámara activa"
          />
          {camera && camera.streamUrl !== streamUrl.trim() ? (
            <Alert severity="info">Al cambiar la dirección del video tendrás que calibrar de nuevo la puerta.</Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !name.trim() || !streamUrl.trim()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
