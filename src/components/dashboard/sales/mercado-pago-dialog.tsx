'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import apiClient from '@/lib/api-client';

export interface MercadoPagoDialogProps {
  open: boolean;
  amount: number;
  onPaid: (orderId: string) => void;
  onClose: () => void;
}

interface MpOrder {
  id: string;
  status: string;
  statusDetail?: string | null;
}

interface Terminal {
  id: string;
  label: string;
}

const POLL_MS = 2000;
const FINAL_FAILURES = ['failed', 'canceled', 'expired'];
const TERMINAL_KEY = 'pos-mp-terminal';

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string } } }).response?.data;
  return data?.message ?? 'No se pudo comunicar con Mercado Pago.';
}

// Accepts the shapes the terminals list can come in: { data: { terminals: [...] } } or similar.
function parseTerminals(body: unknown): Terminal[] {
  const root = body as { data?: unknown; terminals?: unknown };
  const inner = root?.data as { terminals?: unknown } | unknown[] | undefined;
  const list = (Array.isArray(inner) ? inner : (inner as { terminals?: unknown })?.terminals ?? root?.terminals ?? []) as {
    id: string;
    name?: string;
    external_pos_id?: string;
  }[];
  return list.map((t) => ({ id: t.id, label: t.name ?? t.external_pos_id ?? t.id }));
}

// Sends the amount to the Point terminal and waits for the customer to pay on it.
export function MercadoPagoDialog({ open, amount, onPaid, onClose }: MercadoPagoDialogProps): React.JSX.Element {
  const [terminals, setTerminals] = React.useState<Terminal[]>([]);
  const [terminalId, setTerminalId] = React.useState('');
  const [phase, setPhase] = React.useState<'loading' | 'select' | 'waiting' | 'error' | 'cancelling'>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const orderIdRef = React.useRef<string | null>(null);
  const keyRef = React.useRef('');

  const startCharge = React.useCallback(
    async (terminal: string): Promise<void> => {
      setError(null);
      setPhase('waiting');
      try {
        const res = await apiClient.post<MpOrder>('/MercadoPago/charge', {
          amount,
          terminalId: terminal || undefined,
          idempotencyKey: keyRef.current,
        });
        orderIdRef.current = res.data.id;
      } catch (err) {
        setError(errorMessage(err));
        setPhase('error');
      }
    },
    [amount]
  );

  // On open: find the terminal to use (saved choice, server default, or ask), then charge.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    orderIdRef.current = null;
    keyRef.current = crypto.randomUUID();
    setPhase('loading');
    setError(null);
    (async () => {
      try {
        const status = await apiClient.get<{ enabled: boolean; defaultTerminalId?: string | null }>('/MercadoPago/status');
        if (cancelled) return;
        if (!status.data.enabled) {
          setError('Mercado Pago no está configurado en el servidor.');
          setPhase('error');
          return;
        }
        let saved = '';
        try {
          saved = localStorage.getItem(TERMINAL_KEY) ?? '';
        } catch {
          // localStorage unavailable: just ask again.
        }
        const preset = saved || status.data.defaultTerminalId || '';
        if (preset) {
          setTerminalId(preset);
          await startCharge(preset);
          return;
        }
        const list = parseTerminals((await apiClient.get('/MercadoPago/terminals')).data);
        if (cancelled) return;
        setTerminals(list);
        setTerminalId(list[0]?.id ?? '');
        setPhase('select');
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, startCharge]);

  // Poll the order until the terminal reports a result.
  React.useEffect(() => {
    if (!open || phase !== 'waiting') return;
    const timer = setInterval(async () => {
      const orderId = orderIdRef.current;
      if (!orderId) return;
      try {
        const res = await apiClient.get<MpOrder>(`/MercadoPago/orders/${orderId}`);
        if (res.data.status === 'processed') {
          clearInterval(timer);
          onPaid(orderId);
        } else if (FINAL_FAILURES.includes(res.data.status)) {
          clearInterval(timer);
          setError(
            res.data.status === 'expired'
              ? 'El cobro expiró en la terminal.'
              : res.data.status === 'canceled'
                ? 'El cobro fue cancelado.'
                : 'El pago fue rechazado. Intenta con otra tarjeta.'
          );
          orderIdRef.current = null;
          keyRef.current = crypto.randomUUID();
          setPhase('error');
        }
      } catch {
        // Transient network error: keep polling.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, phase, onPaid]);

  const handleCancel = async (): Promise<void> => {
    const orderId = orderIdRef.current;
    if (orderId && phase === 'waiting') {
      setPhase('cancelling');
      try {
        await apiClient.post(`/MercadoPago/orders/${orderId}/cancel`);
      } catch (err) {
        // The customer may have just paid: check before closing so a paid order is not abandoned.
        try {
          const res = await apiClient.get<MpOrder>(`/MercadoPago/orders/${orderId}`);
          if (res.data.status === 'processed') {
            onPaid(orderId);
            return;
          }
        } catch {
          // fall through to the error below
        }
        setError(`No se pudo cancelar el cobro en la terminal: ${errorMessage(err)}`);
        setPhase('error');
        return;
      }
    }
    orderIdRef.current = null;
    onClose();
  };

  const choose = async (): Promise<void> => {
    try {
      localStorage.setItem(TERMINAL_KEY, terminalId);
    } catch {
      // not persisted; fine
    }
    await startCharge(terminalId);
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={() => undefined}>
      <DialogTitle>Cobrar con terminal Mercado Pago</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
          <Typography variant="h4">${amount.toFixed(2)}</Typography>
          {phase === 'loading' || phase === 'cancelling' ? <CircularProgress /> : null}
          {phase === 'select' ? (
            <TextField select fullWidth label="Terminal" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} helperText={terminals.length === 0 ? 'No hay terminales vinculadas a la cuenta.' : undefined}>
              {terminals.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {phase === 'waiting' ? (
            <>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" align="center">
                Esperando a que el cliente pague en la terminal…
              </Typography>
            </>
          ) : null}
          {error ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={phase === 'cancelling'}>
          {phase === 'waiting' ? 'Cancelar cobro' : 'Cerrar'}
        </Button>
        {phase === 'select' ? (
          <Button variant="contained" onClick={choose} disabled={!terminalId}>
            Enviar a terminal
          </Button>
        ) : null}
        {phase === 'error' ? (
          <Button variant="contained" onClick={() => startCharge(terminalId)}>
            Reintentar
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
