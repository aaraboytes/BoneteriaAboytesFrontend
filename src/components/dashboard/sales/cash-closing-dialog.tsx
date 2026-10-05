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
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import apiClient from '@/lib/api-client';

import { ClosingReportView, SummaryRows, printStyles, type CashSessionSummary, type ClosingReport } from './closing-report-view';

export type { CashSessionSummary } from './closing-report-view';

export interface CashClosingDialogProps {
  open: boolean;
  sessionId: number;
  registerLabel: string;
  forced?: boolean;
  onClose: () => void;
  onClosed: () => void;
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

  return (
    <Dialog open={open} onClose={forced || report ? undefined : onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={forced}>
      <style>{printStyles}</style>
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
              <ClosingReportView report={report} />
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
