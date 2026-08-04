'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Buildings as StoreIcon,
  Plus as PlusIcon,
  PencilSimple as EditIcon,
  Trash as TrashIcon,
  ArrowsClockwise as RefreshIcon,
  MapPin as LocationIcon,
  Phone as PhoneIcon,
  Package as PackageIcon
} from '@phosphor-icons/react';
import apiClient from '@/lib/api-client';

export interface StoreItem {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export default function StoresPage(): React.JSX.Element {
  const [stores, setStores] = React.useState<StoreItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog State
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<StoreItem | null>(null);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/Stores');
      setStores(res.data);
    } catch (err) {
      console.error('Failed to fetch stores', err);
      setError('No se pudieron cargar las sucursales del servidor.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStores();
  }, []);

  const handleOpenCreate = () => {
    setEditingStore(null);
    setName('');
    setCode('');
    setAddress('');
    setPhone('');
    setOpenDialog(true);
  };

  const handleOpenEdit = (store: StoreItem) => {
    setEditingStore(store);
    setName(store.name);
    setCode(store.code);
    setAddress(store.address);
    setPhone(store.phone);
    setOpenDialog(true);
  };

  const handleSaveStore = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingStore) {
        await apiClient.put(`/Stores/${editingStore.id}`, { name, code, address, phone });
      } else {
        await apiClient.post('/Stores', { name, code, address, phone });
      }
      setOpenDialog(false);
      fetchStores();
    } catch (err) {
      console.error('Failed to save store', err);
      alert('Ocurrió un error al guardar la sucursal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async (store: StoreItem) => {
    if (!window.confirm(`¿Estás seguro de eliminar / desactivar la sucursal "${store.name}"?`)) return;
    try {
      await apiClient.delete(`/Stores/${store.id}`);
      fetchStores();
    } catch (err) {
      console.error('Failed to delete store', err);
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3, md: 4 } }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.5, sm: 3 }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Stack spacing={0.5}>
              <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                Gestión De Sucursales & Tiendas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administra cada tienda con su inventario totalmente independiente y autónomo.
              </Typography>
            </Stack>

            <Button
              variant="contained"
              startIcon={<PlusIcon />}
              onClick={handleOpenCreate}
              sx={{ borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
            >
              Nueva Sucursal / Tienda
            </Button>
          </Stack>

          {error && (
            <Alert severity="warning" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {stores.map((store) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={store.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(30, 43, 73, 0.08)',
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              display: 'flex',
                            }}
                          >
                            <StoreIcon size={28} />
                          </Box>
                          <Typography variant="caption" fontWeight={700} color="primary" sx={{ bgcolor: 'primary.alpha12', px: 1.5, py: 0.5, borderRadius: 1.5 }}>
                            {store.code || `SUC-${store.id}`}
                          </Typography>
                        </Stack>

                        <Box pt={1}>
                          <Typography variant="h6" fontWeight={700}>
                            {store.name}
                          </Typography>
                        </Box>

                        <Stack spacing={1} pt={0.5}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationIcon size={18} color="var(--mui-palette-text-secondary)" />
                            <Typography variant="body2" color="text.secondary">
                              {store.address || 'Sin dirección registrada'}
                            </Typography>
                          </Stack>

                          {store.phone && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PhoneIcon size={18} color="var(--mui-palette-text-secondary)" />
                              <Typography variant="body2" color="text.secondary">
                                {store.phone}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ px: 3, pb: 2.5, pt: 0, justifyContent: 'flex-end' }}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(store)}>
                        <EditIcon size={20} />
                      </IconButton>
                      {stores.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => handleDeleteStore(store)}>
                          <TrashIcon size={20} />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>

        {/* Create / Edit Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{editingStore ? 'Editar Sucursal' : 'Nueva Sucursal / Tienda'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} pt={1}>
              <TextField
                label="Nombre de la Tienda / Sucursal"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sucursal Centro, Tienda Matriz"
                autoFocus
              />
              <TextField
                label="Código Interno (Opcional)"
                fullWidth
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. SUC-002"
              />
              <TextField
                label="Dirección"
                fullWidth
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, Número, Colonia, Ciudad"
              />
              <TextField
                label="Teléfono de Contacto"
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 477-123-4567"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSaveStore} disabled={saving || !name.trim()}>
              {saving ? <CircularProgress size={20} /> : 'Guardar Sucursal'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
