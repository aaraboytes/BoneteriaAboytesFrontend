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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

interface CashSessionSummary {
  saleCount: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalIncomes: number;
  totalWithdrawals: number;
  openingAmount: number;
  expectedCash: number;
}

interface CloseResult {
  session: {
    id: number;
    cashDifference: number;
    countedCashAmount: number;
    expectedCashAmount: number;
    closedAt: string;
  };
  summary: CashSessionSummary;
}

export interface CashClosingDialogProps {
  open: boolean;
  sessionId: number;
  storeName: string;
  employeeId?: number;
  forced?: boolean;
  onClose: () => void;
  onClosed: () => void;
}

export function CashClosingDialog({
  open,
  sessionId,
  storeName,
  employeeId,
  forced,
  onClose,
  onClosed,
}: CashClosingDialogProps): React.JSX.Element {
  const [summary, setSummary] = React.useState<CashSessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [countedAmount, setCountedAmount] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CloseResult | null>(null);

  React.useEffect(() => {
    if (open) {
      setCountedAmount('');
      setError(null);
      setResult(null);
      setLoadingSummary(true);
      apiClient
        .get(`/CashRegister/${sessionId}/summary`)
        .then((res) => setSummary(res.data))
        .catch((err) => {
          console.error('Failed to fetch cash session summary', err);
          setError('No se pudo cargar el resumen de la caja.');
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [open, sessionId]);

  const handleSubmit = async (): Promise<void> => {
    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<CloseResult>(`/CashRegister/${sessionId}/close`, {
        countedCashAmount: counted,
        employeeId,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cerrar la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  const money = (v: number) => `$${v.toFixed(2)}`;

  return (
    <Dialog open={open} onClose={forced ? () => {} : onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={forced}>
      <DialogTitle>{forced ? 'Cierre de Caja Pendiente' : 'Cierre de Caja'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Sucursal: <strong>{storeName}</strong>
          </Typography>

          {forced ? (
            <Alert severity="warning">
              La caja de un día anterior quedó abierta. Debes cerrarla antes de continuar.
            </Alert>
          ) : null}

          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : result ? (
            <Stack spacing={1.5}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Efectivo esperado</TableCell>
                    <TableCell align="right">{money(result.session.expectedCashAmount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Efectivo contado</TableCell>
                    <TableCell align="right">{money(result.session.countedCashAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: result.session.cashDifference === 0 ? 'success.lighter' : 'warning.lighter',
                }}
              >
                <Typography variant="h6">Diferencia</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {result.session.cashDifference > 0 ? '+' : ''}
                  {money(result.session.cashDifference)}
                </Typography>
              </Box>
            </Stack>
          ) : summary ? (
            <Stack spacing={2}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Fondo inicial</TableCell>
                    <TableCell align="right">{money(summary.openingAmount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ventas en efectivo</TableCell>
                    <TableCell align="right">{money(summary.cashSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ventas con tarjeta</TableCell>
                    <TableCell align="right">{money(summary.cardSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ventas por transferencia</TableCell>
                    <TableCell align="right">{money(summary.transferSales)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider' } }}>
                    <TableCell>Total de ventas ({summary.saleCount})</TableCell>
                    <TableCell align="right">{money(summary.totalSales)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Ingresos externos</TableCell>
                    <TableCell align="right">{money(summary.totalIncomes)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Retiros</TableCell>
                    <TableCell align="right">-{money(summary.totalWithdrawals)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider' } }}>
                    <TableCell>Efectivo esperado en caja</TableCell>
                    <TableCell align="right">{money(summary.expectedCash)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <TextField
                label="Efectivo contado en caja"
                type="number"
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                inputProps={{ step: '0.01', min: 0 }}
                autoFocus
              />
            </Stack>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button variant="contained" onClick={onClosed}>
            Aceptar
          </Button>
        ) : (
          <>
            {!forced ? (
              <Button onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
            ) : null}
            <Button variant="contained" onClick={handleSubmit} disabled={submitting || loadingSummary}>
              {submitting ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
