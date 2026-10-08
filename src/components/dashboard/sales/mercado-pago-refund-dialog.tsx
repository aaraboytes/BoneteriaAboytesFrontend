'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import apiClient from '@/lib/api-client';

export interface MercadoPagoRefundDialogProps {
  open: boolean;
  orderId: string;
  amount: number;
  onClose: () => void;
  onRefunded: () => void;
}

// Giving back a terminal charge needs an administrator's username and password, like cancelling a sale.
export function MercadoPagoRefundDialog({ open, orderId, amount, onClose, onRefunded }: MercadoPagoRefundDialogProps): React.JSX.Element {
  const [adminUsername, setAdminUsername] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAdminUsername('');
      setAdminPassword('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    if (!adminUsername.trim() || !adminPassword) {
      setError('Un administrador o gerente debe autorizar el reembolso.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/MercadoPago/orders/${orderId}/refund`, { adminUsername: adminUsername.trim(), adminPassword });
      onRefunded();
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string } } }).response?.data;
      setError(data?.message ?? 'No se pudo reembolsar el cobro de Mercado Pago.');
      setAdminPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reembolsar cobro de Mercado Pago</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Se devolverá <strong>${amount.toFixed(2)}</strong> al cliente por la terminal de Mercado Pago.
          </Typography>
          <Typography variant="subtitle2">Autorización de administrador o gerente</Typography>
          <TextField label="Usuario administrador o gerente" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} autoComplete="off" autoFocus />
          <TextField label="Contraseña" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="off" />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Volver
        </Button>
        <Button variant="contained" color="error" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Reembolsando...' : 'Reembolsar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
