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

export interface CashierTicket {
  ticket: string;
  employeeId: number;
  employeeName: string;
}

export interface CashierSwitchDialogProps {
  open: boolean;
  cashRegisterId: number;
  amountDue: number;
  onAuthenticated: (ticket: CashierTicket) => void;
  onClose: () => void;
}

// Several cashiers share one drawer: before each sale the cashier identifies with their user and
// PIN (or password). The API returns a single-use ticket that the sale request carries.
export function CashierSwitchDialog({ open, cashRegisterId, amountDue, onAuthenticated, onClose }: CashierSwitchDialogProps): React.JSX.Element {
  const [username, setUsername] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setUsername('');
      setSecret('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event?: React.FormEvent): Promise<void> => {
    event?.preventDefault();
    if (!username.trim() || !secret) {
      setError('Indica tu usuario y PIN o contraseña.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<CashierTicket>('/Pos/cashier-auth', {
        cashRegisterId,
        username: username.trim(),
        pinOrPassword: secret,
      });
      onAuthenticated(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo identificar al cajero.');
      setSecret('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>¿Quién cobra?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total estimado: <strong>${amountDue.toFixed(2)}</strong>. Identifícate para registrar la venta a tu nombre.
            </Typography>
            <TextField
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            <TextField
              label="PIN o contraseña"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Verificando...' : 'Cobrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
