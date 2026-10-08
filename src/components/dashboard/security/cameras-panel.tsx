'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Door, DoorOpen, PencilSimple, Plus, Trash, VideoCamera, Crosshair, Storefront } from '@phosphor-icons/react';
import NextLink from 'next/link';

import apiClient from '@/lib/api-client';
import { paths } from '@/paths';

import { CameraDialog } from './camera-dialog';
import { apiErrorMessage, type Camera, type StoreOption } from './types';
import { ZoneEditorDialog } from './zone-editor-dialog';

function formatSince(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function DoorChip({ camera }: { camera: Camera }): React.JSX.Element {
  if (!camera.zone || !camera.calibratedAt) {
    return <Chip size="small" variant="outlined" label={camera.zone ? 'Sin calibrar' : 'Sin zona'} />;
  }
  if (camera.doorState === 'OPEN') return <Chip size="small" color="warning" icon={<DoorOpen size={16} />} label="Puerta abierta" />;
  if (camera.doorState === 'CLOSED') return <Chip size="small" color="success" icon={<Door size={16} />} label="Puerta cerrada" />;
  return <Chip size="small" variant="outlined" label="Estado desconocido" />;
}

export function CamerasPanel(): React.JSX.Element {
  const [cameras, setCameras] = React.useState<Camera[]>([]);
  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Camera | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [zoneCameraId, setZoneCameraId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState<Camera | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await apiClient.get<Camera[]>('/Cameras');
      setCameras(res.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron cargar las cámaras.'));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    apiClient
      .get<StoreOption[]>('/Stores')
      .then((res) => {
        setStores(res.data);
      })
      .catch(() => {
        setStores([]);
      });
    // Status (online, door open/closed) changes on its own, so keep it fresh.
    const timer = setInterval(() => void load(), 5000);
    return () => {
      clearInterval(timer);
    };
  }, [load]);

  const confirmDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await apiClient.delete(`/Cameras/${deleting.id}`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar la cámara.'));
      setDeleting(null);
    }
  };

  const zoneCamera = cameras.find((c) => c.id === zoneCameraId) ?? null;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Cada cámara vigila una puerta. Cuando se abre o se cierra, el evento aparece en{' '}
          <Box component={NextLink} href={paths.dashboard.activity} sx={{ color: 'primary.main' }}>
            Actividad
          </Box>
          .
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Añadir cámara
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : cameras.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center' }}>
          <VideoCamera size={48} color="var(--mui-palette-text-secondary)" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Aún no hay cámaras
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Añade una cámara IP (RTSP), dibuja la puerta y calibra para empezar a recibir avisos.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {cameras.map((camera) => (
            <Grid key={camera.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: camera.isActive ? 1 : 0.65 }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ p: 1, borderRadius: '50%', display: 'flex', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                          <VideoCamera size={20} weight="bold" />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                            {camera.name}
                          </Typography>
                          {camera.storeName ? (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                              <Storefront size={14} />
                              <Typography variant="caption">{camera.storeName}</Typography>
                            </Stack>
                          ) : null}
                        </Box>
                      </Stack>
                      <Chip
                        size="small"
                        color={!camera.isActive ? 'default' : camera.online ? 'success' : 'error'}
                        label={!camera.isActive ? 'Desactivada' : camera.online ? 'En línea' : 'Sin conexión'}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <DoorChip camera={camera} />
                      {camera.doorStateChangedAt && camera.calibratedAt ? (
                        <Typography variant="caption" color="text.secondary">
                          desde {formatSince(camera.doorStateChangedAt)}
                        </Typography>
                      ) : null}
                    </Stack>

                    {camera.lastError ? (
                      <Alert severity="warning" sx={{ py: 0 }}>
                        {camera.lastError}
                      </Alert>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Crosshair size={16} />}
                    onClick={() => {
                      setZoneCameraId(camera.id);
                    }}
                  >
                    Zona y calibración
                  </Button>
                  <Box>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(camera);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilSimple size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setDeleting(camera);
                        }}
                      >
                        <Trash size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <CameraDialog
        open={dialogOpen}
        camera={editing}
        stores={stores}
        onClose={() => {
          setDialogOpen(false);
        }}
        onSaved={() => void load()}
      />

      <ZoneEditorDialog
        open={zoneCamera !== null}
        camera={zoneCamera}
        onClose={() => {
          setZoneCameraId(null);
        }}
        onChanged={() => void load()}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
        }}
      >
        <DialogTitle>Eliminar cámara</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se eliminará «{deleting?.name}» junto con su historial de aperturas y cierres. Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleting(null);
            }}
          >
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
