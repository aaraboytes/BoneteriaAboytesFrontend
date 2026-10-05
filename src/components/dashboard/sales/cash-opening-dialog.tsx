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

export interface CashOpeningDialogProps {
  open: boolean;
  cashRegisterId: number;
  /** e.g. "Caja 1 · Tienda Principal" */
  registerLabel: string;
  onOpened: () => void;
  onClose: () => void;
}

export function CashOpeningDialog({ open, cashRegisterId, registerLabel, onOpened, onClose }: CashOpeningDialogProps): React.JSX.Element {
  const [amount, setAmount] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const openingAmount = parseFloat(amount);
    if (isNaN(openingAmount) || openingAmount < 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/CashSessions/open', { cashRegisterId, openingAmount });
      onOpened();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo abrir la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Apertura de Caja</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Caja: <strong>{registerLabel}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Debes abrir la caja antes de registrar ventas. Varios cajeros pueden usarla; cada uno se identifica al cobrar.
          </Typography>
          <TextField
            label="Monto inicial en caja"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ step: '0.01', min: 0 }}
            autoFocus
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Más tarde
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Abriendo...' : 'Abrir Caja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
