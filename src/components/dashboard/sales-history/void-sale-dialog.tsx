'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import apiClient from '@/lib/api-client';

export interface VoidSaleDialogProps {
  open: boolean;
  sale: { id: number; folio: string | null; total: number } | null;
  onClose: () => void;
  onVoided: () => void;
}

// Cancelling a sale needs an administrator's username and password, like cash withdrawals.
// The stock goes back and the sale stops counting in the drawer's cash.
export function VoidSaleDialog({ open, sale, onClose, onVoided }: VoidSaleDialogProps): React.JSX.Element {
  const [reason, setReason] = React.useState('');
  const [adminUsername, setAdminUsername] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setAdminUsername('');
      setAdminPassword('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!sale) return;
    if (!reason.trim()) {
      setError('Indica el motivo de la cancelación.');
      return;
    }
    if (!adminUsername.trim() || !adminPassword) {
      setError('Un administrador debe autorizar la cancelación.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/Sales/${sale.id}/void`, {
        reason: reason.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
      });
      onVoided();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cancelar la venta.');
      setAdminPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cancelar venta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {sale ? (
            <Typography variant="body2" color="text.secondary">
              Venta <strong>{sale.folio ?? `#${sale.id}`}</strong> por <strong>${sale.total.toFixed(2)}</strong>. El inventario se
              repone y el efectivo deja de contar en la caja.
            </Typography>
          ) : null}
          <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} autoFocus />
          <Typography variant="subtitle2">Autorización de administrador</Typography>
          <TextField label="Usuario administrador" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} autoComplete="off" />
          <TextField
            label="Contraseña"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="off"
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Volver
        </Button>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Cancelando...' : 'Cancelar venta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
