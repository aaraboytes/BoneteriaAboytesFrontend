'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import apiClient from '@/lib/api-client';

export interface CashMovementDialogProps {
  open: boolean;
  storeId: number;
  employeeId?: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CashMovementDialog({ open, storeId, employeeId, onClose, onSuccess }: CashMovementDialogProps): React.JSX.Element {
  const [type, setType] = React.useState<'Withdrawal' | 'Income'>('Withdrawal');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setType('Withdrawal');
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (!reason.trim()) {
      setError('Ingresa un motivo.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/CashRegister/movements', {
        storeId,
        type,
        amount: numAmount,
        reason: reason.trim(),
        employeeId,
      });
      onSuccess(type === 'Withdrawal' ? 'Retiro de efectivo registrado.' : 'Ingreso externo registrado.');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo registrar el movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Movimiento de Caja</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            value={type}
            exclusive
            fullWidth
            onChange={(_, value) => value && setType(value)}
          >
            <ToggleButton value="Withdrawal" color="error">
              Retiro
            </ToggleButton>
            <ToggleButton value="Income" color="success">
              Ingreso Externo
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Monto"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ step: '0.01', min: 0 }}
            autoFocus
          />
          <TextField
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={type === 'Withdrawal' ? 'error' : 'success'}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Guardando...' : type === 'Withdrawal' ? 'Registrar Retiro' : 'Registrar Ingreso'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
