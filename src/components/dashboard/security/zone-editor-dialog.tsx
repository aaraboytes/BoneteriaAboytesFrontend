'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import apiClient from '@/lib/api-client';

import { apiErrorMessage, type Camera, type CameraZone } from './types';

interface ZoneEditorDialogProps {
  open: boolean;
  camera: Camera | null;
  onClose: () => void;
  onChanged: () => void;
}

const clamp = (v: number): number => Math.min(1, Math.max(0, v));

export function ZoneEditorDialog({ open, camera, onClose, onChanged }: ZoneEditorDialogProps): React.JSX.Element | null {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [waitingImage, setWaitingImage] = React.useState(true);
  const [zone, setZone] = React.useState<CameraZone | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);

  const cameraId = camera?.id;

  // Start from the saved zone each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setZone(camera?.zone ?? null);
    setDirty(false);
    setError(null);
    setNotice(null);
    setWaitingImage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when the dialog (re)opens for a camera
  }, [open, cameraId]);

  // The worker uploads a picture every few seconds; keep showing the newest one.
  React.useEffect(() => {
    if (!open || cameraId === undefined) return undefined;
    let cancelled = false;
    let current: string | null = null;

    const load = async (): Promise<void> => {
      try {
        const res = await apiClient.get<Blob>(`/Cameras/${cameraId}/frame`, { responseType: 'blob' });
        if (cancelled) return;
        const url = URL.createObjectURL(res.data);
        if (current) URL.revokeObjectURL(current);
        current = url;
        setImageUrl(url);
        setWaitingImage(false);
      } catch {
        if (!cancelled) setWaitingImage(true);
      }
    };

    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (current) URL.revokeObjectURL(current);
      setImageUrl(null);
    };
  }, [open, cameraId]);

  const pointFromEvent = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  };

  const handlePointerDown = (e: React.PointerEvent): void => {
    if (!imageUrl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = pointFromEvent(e);
    setZone({ ...dragStart.current, width: 0, height: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent): void => {
    const start = dragStart.current;
    if (!start) return;
    const p = pointFromEvent(e);
    setZone({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) });
    setDirty(true);
  };

  const handlePointerUp = (): void => {
    dragStart.current = null;
  };

  const zoneValid = zone !== null && zone.width >= 0.02 && zone.height >= 0.02;

  const saveZone = async (): Promise<void> => {
    if (!camera || !zone) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.put(`/Cameras/${camera.id}/zone`, zone);
      setDirty(false);
      setNotice('Zona guardada. Ahora, con la puerta cerrada, pulsa «Calibrar».');
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar la zona.'));
    } finally {
      setBusy(false);
    }
  };

  const calibrate = async (): Promise<void> => {
    if (!camera) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.post(`/Cameras/${camera.id}/calibrate`);
      setNotice('Calibrando… el worker tomará la imagen actual como «puerta cerrada» en unos segundos.');
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo iniciar la calibración.'));
    } finally {
      setBusy(false);
    }
  };

  if (!camera) return null;

  const saved = camera.zone !== null && !dirty;
  const calibrating = camera.calibrationRequested;
  const calibrated = camera.calibratedAt !== null && saved;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Zona de la puerta · {camera.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            1. Arrastra sobre la imagen un recuadro que cubra la puerta. 2. Con la puerta <b>cerrada</b>, guarda la zona y pulsa «Calibrar».
            Se avisará cuando la zona cambie de forma sostenida (puerta abierta) y cuando vuelva a verse como en la calibración (cerrada).
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {notice && !error ? <Alert severity="info">{notice}</Alert> : null}
          {!camera.online ? (
            <Alert severity="warning">
              La cámara no está en línea. Verifica que el worker de seguridad esté ejecutándose y que la dirección del video sea correcta.
            </Alert>
          ) : null}

          <Box
            ref={boxRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            sx={{
              position: 'relative',
              width: '100%',
              minHeight: 240,
              bgcolor: 'neutral.900',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: imageUrl ? 'crosshair' : 'default',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL, not optimizable by next/image
              <img src={imageUrl} alt="Vista de la cámara" draggable={false} style={{ display: 'block', width: '100%' }} />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240, color: 'common.white', p: 3 }}>
                <Typography variant="body2" align="center">
                  {waitingImage ? 'Esperando la primera imagen del worker de seguridad…' : ''}
                </Typography>
              </Stack>
            )}
            {zone && zone.width > 0 && zone.height > 0 ? (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${zone.x * 100}%`,
                  top: `${zone.y * 100}%`,
                  width: `${zone.width * 100}%`,
                  height: `${zone.height * 100}%`,
                  border: '2px solid',
                  borderColor: dirty ? 'warning.main' : 'success.main',
                  bgcolor: dirty ? 'rgba(255,167,38,0.18)' : 'rgba(76,175,80,0.18)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" color={saved ? 'success' : 'default'} label={saved ? 'Zona guardada' : zoneValid ? 'Zona sin guardar' : 'Sin zona'} />
            <Chip
              size="small"
              color={calibrated ? 'success' : calibrating ? 'warning' : 'default'}
              label={calibrated ? 'Calibrada (puerta cerrada)' : calibrating ? 'Calibrando…' : 'Sin calibrar'}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button variant="outlined" onClick={() => void saveZone()} disabled={busy || !zoneValid || !dirty}>
          Guardar zona
        </Button>
        <Button variant="contained" onClick={() => void calibrate()} disabled={busy || !saved || calibrating || !camera.online}>
          {calibrated ? 'Volver a calibrar' : 'Calibrar (puerta cerrada)'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
