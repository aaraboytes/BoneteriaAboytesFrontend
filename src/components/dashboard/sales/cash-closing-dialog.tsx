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
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

import type { CashMovement } from './cash-movement-dialog';

interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  isCash: boolean;
  amount: number;
}

interface CashierTotal {
  employeeId: number | null;
  name: string;
  salesCount: number;
  totalSales: number;
}

export interface CashSessionSummary {
  openingAmount: number;
  saleCount: number;
  totalSales: number;
  paymentsByMethod: PaymentMethodTotal[];
  cashSales: number;
  totalIncomes: number;
  totalWithdrawals: number;
  cashRefunds: number;
  expectedCash: number;
  cashiers: CashierTotal[];
}

interface ClosingReport {
  session: {
    id: number;
    cashRegisterName: string;
    storeName: string;
    businessDate: string;
    openedAt: string;
    openedBy: string | null;
    closedAt: string | null;
    closedBy: string | null;
    expectedCashAmount: number;
    countedCashAmount: number;
    cashDifference: number;
    notes: string | null;
  };
  summary: CashSessionSummary;
  movements: CashMovement[];
}

export interface CashClosingDialogProps {
  open: boolean;
  sessionId: number;
  registerLabel: string;
  forced?: boolean;
  onClose: () => void;
  onClosed: () => void;
}

const money = (v: number): string => `$${v.toFixed(2)}`;
const dateTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function SummaryRows({ summary }: { summary: CashSessionSummary }): React.JSX.Element {
  return (
    <>
      <TableRow>
        <TableCell>Fondo inicial</TableCell>
        <TableCell align="right">{money(summary.openingAmount)}</TableCell>
      </TableRow>
      {summary.paymentsByMethod.map((m) => (
        <TableRow key={m.paymentMethodId}>
          <TableCell>Ventas {m.name.toLowerCase()}</TableCell>
          <TableCell align="right">{money(m.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow sx={{ '& td': { fontWeight: 700 } }}>
        <TableCell>Total de ventas ({summary.saleCount})</TableCell>
        <TableCell align="right">{money(summary.totalSales)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Ingresos de efectivo</TableCell>
        <TableCell align="right">+{money(summary.totalIncomes)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Retiros</TableCell>
        <TableCell align="right">-{money(summary.totalWithdrawals)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Reembolsos en efectivo</TableCell>
        <TableCell align="right">-{money(summary.cashRefunds)}</TableCell>
      </TableRow>
      <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider' } }}>
        <TableCell>Efectivo esperado en caja</TableCell>
        <TableCell align="right">{money(summary.expectedCash)}</TableCell>
      </TableRow>
    </>
  );
}

export function CashClosingDialog({ open, sessionId, registerLabel, forced, onClose, onClosed }: CashClosingDialogProps): React.JSX.Element {
  const [summary, setSummary] = React.useState<CashSessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [countedAmount, setCountedAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<ClosingReport | null>(null);

  React.useEffect(() => {
    if (open) {
      setCountedAmount('');
      setNotes('');
      setError(null);
      setReport(null);
      setLoadingSummary(true);
      apiClient
        .get<CashSessionSummary>(`/CashSessions/${sessionId}/summary`)
        .then((res) => setSummary(res.data))
        .catch((err) => {
          console.error('Failed to fetch cash session summary', err);
          setError(err?.response?.data?.message || 'No se pudo cargar el resumen de la caja.');
        })
        .finally(() => setLoadingSummary(false));
    }
  }, [open, sessionId]);

  const handleSubmit = async (): Promise<void> => {
    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      setError('Ingresa el efectivo contado.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post<ClosingReport>(`/CashSessions/${sessionId}/close`, {
        countedCashAmount: counted,
        notes: notes.trim() || undefined,
      });
      setReport(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo cerrar la caja.');
    } finally {
      setSubmitting(false);
    }
  };

  const difference = report?.session.cashDifference ?? 0;

  return (
    <Dialog open={open} onClose={forced || report ? undefined : onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={forced}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cash-closing-printable, #cash-closing-printable * { visibility: visible; }
          #cash-closing-printable { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <DialogTitle>{report ? 'Reporte de Cierre de Caja' : forced ? 'Cierre de Caja Pendiente' : 'Cierre de Caja'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!report ? (
            <Typography variant="body2" color="text.secondary">
              Caja: <strong>{registerLabel}</strong>
            </Typography>
          ) : null}

          {forced && !report ? (
            <Alert severity="warning">La caja de un día anterior quedó abierta. Debes cerrarla antes de continuar.</Alert>
          ) : null}

          {loadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : report ? (
            <Box id="cash-closing-printable">
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {report.session.cashRegisterName} · {report.session.storeName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Día: {report.session.businessDate} · Abrió {report.session.openedBy ?? '—'} ({dateTime(report.session.openedAt)}) · Cerró{' '}
                    {report.session.closedBy ?? '—'} ({dateTime(report.session.closedAt)})
                  </Typography>
                </Box>

                <Table size="small">
                  <TableBody>
                    <SummaryRows summary={report.summary} />
                    <TableRow>
                      <TableCell>Efectivo contado</TableCell>
                      <TableCell align="right">{money(report.session.countedCashAmount)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: difference === 0 ? 'success.lighter' : 'warning.lighter',
                  }}
                >
                  <Typography variant="h6">{difference === 0 ? 'Cuadra' : difference > 0 ? 'Sobrante' : 'Faltante'}</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {difference > 0 ? '+' : ''}
                    {money(difference)}
                  </Typography>
                </Box>

                {report.summary.cashiers.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Ventas por cajero
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Cajero</TableCell>
                          <TableCell align="right">Ventas</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {report.summary.cashiers.map((c) => (
                          <TableRow key={c.employeeId ?? 0}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell align="right">{c.salesCount}</TableCell>
                            <TableCell align="right">{money(c.totalSales)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : null}

                {report.movements.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Movimientos de efectivo
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {report.movements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>{dateTime(m.createdAt)}</TableCell>
                            <TableCell>
                              {m.type === 'Withdrawal' ? 'Retiro' : 'Ingreso'}: {m.reason}
                              {m.approvedByName ? ` (autorizó ${m.approvedByName})` : ''}
                            </TableCell>
                            <TableCell align="right">
                              {m.type === 'Withdrawal' ? '-' : '+'}
                              {money(m.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : null}

                {report.session.notes ? (
                  <Typography variant="body2">Notas: {report.session.notes}</Typography>
                ) : null}
              </Stack>
            </Box>
          ) : summary ? (
            <Stack spacing={2}>
              <Table size="small">
                <TableBody>
                  <SummaryRows summary={summary} />
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
              <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
            </Stack>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        {report ? (
          <>
            <Button onClick={() => window.print()}>Imprimir</Button>
            <Button variant="contained" onClick={onClosed}>
              Aceptar
            </Button>
          </>
        ) : (
          <>
            {!forced ? (
              <Button onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
            ) : null}
            <Button variant="contained" onClick={handleSubmit} disabled={submitting || loadingSummary || !summary}>
              {submitting ? 'Cerrando...' : 'Cerrar Caja'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
