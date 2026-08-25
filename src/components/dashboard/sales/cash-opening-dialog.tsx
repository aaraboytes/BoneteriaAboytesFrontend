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
  storeId: number;
  storeName: string;
  employeeId?: number;
  onOpened: () => void;
}

export function CashOpeningDialog({ open, storeId, storeName, employeeId, onOpened }: CashOpeningDialogProps): React.JSX.Element {
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
      await apiClient.post('/CashRegister/open', { storeId, openingAmount, employeeId });
      onOpened();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo abrir la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => {}} maxWidth="xs" fullWidth disableEscapeKeyDown>
      <DialogTitle>Apertura de Caja</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Sucursal: <strong>{storeName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Debes abrir la caja antes de registrar ventas en esta sucursal.
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
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Abriendo...' : 'Abrir Caja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
