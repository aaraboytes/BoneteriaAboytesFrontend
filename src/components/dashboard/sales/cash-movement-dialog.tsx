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
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import apiClient from '@/lib/api-client';

export interface CashMovement {
  id: number;
  type: 'Withdrawal' | 'Income';
  amount: number;
  reason: string;
  employeeName: string | null;
  approvedByName: string | null;
  createdAt: string;
}

export interface CashMovementDialogProps {
  open: boolean;
  sessionId: number;
  cashInDrawer?: number | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CashMovementDialog({ open, sessionId, cashInDrawer, onClose, onSuccess }: CashMovementDialogProps): React.JSX.Element {
  const [type, setType] = React.useState<'Withdrawal' | 'Income'>('Withdrawal');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [adminUsername, setAdminUsername] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [movements, setMovements] = React.useState<CashMovement[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setType('Withdrawal');
      setAmount('');
      setReason('');
      setAdminUsername('');
      setAdminPassword('');
      setError(null);
      apiClient
        .get<CashMovement[]>(`/CashSessions/${sessionId}/movements`)
        .then((res) => setMovements(res.data))
        .catch((err) => console.error('Failed to fetch cash movements', err));
    }
  }, [open, sessionId]);

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
    if (type === 'Withdrawal' && (!adminUsername.trim() || !adminPassword)) {
      setError('Un administrador o gerente debe autorizar el retiro con su usuario y contraseña.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/CashSessions/${sessionId}/movements`, {
        type,
        amount: numAmount,
        reason: reason.trim(),
        adminUsername: type === 'Withdrawal' ? adminUsername.trim() : undefined,
        adminPassword: type === 'Withdrawal' ? adminPassword : undefined,
      });
      onSuccess(type === 'Withdrawal' ? 'Retiro de efectivo registrado.' : 'Ingreso de efectivo registrado.');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo registrar el movimiento.');
      setAdminPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Movimiento de Caja</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {cashInDrawer != null ? (
            <Typography variant="body2" color="text.secondary">
              Efectivo en caja: <strong>${cashInDrawer.toFixed(2)}</strong>
            </Typography>
          ) : null}
          <ToggleButtonGroup value={type} exclusive fullWidth onChange={(_, value) => value && setType(value)}>
            <ToggleButton value="Withdrawal" color="error">
              Retiro
            </ToggleButton>
            <ToggleButton value="Income" color="success">
              Ingreso
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
          <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          {type === 'Withdrawal' ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Autorización de administrador o gerente</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Usuario administrador o gerente"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  autoComplete="off"
                  fullWidth
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="off"
                  fullWidth
                />
              </Stack>
            </Stack>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          {movements.length > 0 ? (
            <>
              <Divider />
              <Typography variant="subtitle2">Movimientos de esta caja</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hora</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Registró / Autorizó</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{m.type === 'Withdrawal' ? 'Retiro' : 'Ingreso'}</TableCell>
                      <TableCell>{m.reason}</TableCell>
                      <TableCell>
                        {m.employeeName ?? '—'}
                        {m.approvedByName ? ` / ${m.approvedByName}` : ''}
                      </TableCell>
                      <TableCell align="right">
                        {m.type === 'Withdrawal' ? '-' : '+'}${m.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" color={type === 'Withdrawal' ? 'error' : 'success'} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : type === 'Withdrawal' ? 'Registrar Retiro' : 'Registrar Ingreso'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
