'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

export interface SupplierFormData {
  id?: number;
  name: string;
  email: string;
  telephone: string;
  address: string;
}

interface SupplierDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SupplierFormData) => Promise<void>;
  initialData?: SupplierFormData | null;
}

export function SupplierDialog({ open, onClose, onSave, initialData }: SupplierDialogProps): React.JSX.Element {
  const [formData, setFormData] = React.useState<SupplierFormData>({
    name: '',
    email: '',
    telephone: '',
    address: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        email: initialData.email || '',
        telephone: initialData.telephone || '',
        address: initialData.address || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        telephone: '',
        address: '',
      });
    }
    setError(null);
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre del proveedor es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      setError(err?.response?.data?.message || 'Error al guardar el proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Nombre del Proveedor *"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                error={Boolean(error && !formData.name.trim())}
                helperText={error && !formData.name.trim() ? error : ''}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Correo Electrónico (Email)"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="ejemplo@proveedor.com"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Teléfono"
                fullWidth
                value={formData.telephone}
                onChange={(e) => setFormData((prev) => ({ ...prev, telephone: e.target.value }))}
                placeholder="461-123-4567"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Dirección"
                multiline
                rows={2}
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Calle, Número, Colonia, Ciudad, Estado"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar Proveedor'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
