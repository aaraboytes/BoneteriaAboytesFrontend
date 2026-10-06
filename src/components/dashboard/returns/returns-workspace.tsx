'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Minus as MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { paths } from '@/paths';
import apiClient from '@/lib/api-client';
import { getSelectedCashRegisterId } from '@/lib/pos/cash-register-storage';

interface SaleItem {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  productVariant?: {
    sku?: string;
    product?: { description?: string };
  } | null;
}

interface SaleDetail {
  id: number;
  folio?: string | null;
  status?: string | null;
  date: string;
  total: number;
  storeId?: number | null;
  saleItems: SaleItem[];
}

interface ReturnLineState {
  saleItemId: string;
  description: string;
  sku: string;
  sold: number;
  unitPrice: number;
  quantity: number;
}

interface ReturnResult {
  id: number;
  totalRefunded: number;
  items: Array<{ saleItemId: string; quantity: number; refundAmount: number }>;
}

const money = (n: number): string => `$${n.toFixed(2)}`;

export function ReturnsWorkspace(): React.JSX.Element {
  const searchParams = useSearchParams();
  const presetSaleId = searchParams.get('saleId') ?? '';

  const [saleIdInput, setSaleIdInput] = React.useState(presetSaleId);
  const [sale, setSale] = React.useState<SaleDetail | null>(null);
  const [lines, setLines] = React.useState<ReturnLineState[]>([]);
  const [reason, setReason] = React.useState('');
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const lookup = React.useCallback(async (rawId: string): Promise<void> => {
    const id = rawId.trim();
    if (!id) return;
    setLookupError(null);
    setSubmitError(null);
    setSale(null);
    setLoading(true);
    try {
      const res = await apiClient.get<SaleDetail>(`/Sales/${id}`);
      setSale(res.data);
      setLines(
        res.data.saleItems.map((item) => ({
          saleItemId: item.id,
          description: item.productVariant?.product?.description ?? 'Producto',
          sku: item.productVariant?.sku ?? item.productVariantId,
          sold: item.quantity,
          unitPrice: item.unitPrice,
          quantity: 0,
        }))
      );
      setReason('');
    } catch (err: any) {
      console.error('Failed to look up sale', err);
      setLookupError(
        err?.response?.status === 404
          ? 'No existe una venta con ese número. Revisa el número o búscala en el Historial de ventas.'
          : 'No se pudo buscar la venta. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Arriving from the sales history ("Devolver") loads that sale right away.
  React.useEffect(() => {
    if (presetSaleId) void lookup(presetSaleId);
  }, [presetSaleId, lookup]);

  const setQuantity = (saleItemId: string, quantity: number): void => {
    setLines((prev) =>
      prev.map((line) => (line.saleItemId === saleItemId ? { ...line, quantity: Math.min(line.sold, Math.max(0, quantity)) } : line))
    );
  };

  const items = lines.filter((line) => line.quantity > 0);
  const estimatedRefund = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const isVoided = sale?.status === 'Voided';
  const cashRegisterId = getSelectedCashRegisterId();

  const handleSubmit = async (): Promise<void> => {
    if (!sale || items.length === 0) return;
    if (!cashRegisterId) {
      setSubmitError('Primero elige una caja en Punto de Venta: el reembolso sale de esa caja.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<ReturnResult>('/SaleReturns', {
        saleId: sale.id,
        cashRegisterId,
        reason: reason.trim() || undefined,
        items: items.map((line) => ({ saleItemId: line.saleItemId, quantity: line.quantity })),
      });
      setToast(`Devolución #${res.data.id} registrada. Reembolsa ${money(res.data.totalRefunded)} al cliente.`);
      setSale(null);
      setLines([]);
      setSaleIdInput('');
    } catch (err: any) {
      console.error('Failed to create return', err);
      setSubmitError(err?.response?.data?.message || 'No se pudo registrar la devolución. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const hint = items.length === 0 ? 'Elige cuántas piezas devuelve el cliente.' : null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h2">
            Devoluciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Busca la venta, indica qué piezas regresan y registra el reembolso. ¿No tienes el número? Encuéntrala en{' '}
            <RouterLink href={paths.dashboard.salesHistory}>Historial de ventas</RouterLink> y pulsa “Devolver”.
          </Typography>
        </Stack>

        <Card>
          <CardContent>
            <Stack
              component="form"
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'flex-start' }}
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                void lookup(saleIdInput);
              }}
            >
              <TextField
                label="Número de venta"
                value={saleIdInput}
                onChange={(e) => setSaleIdInput(e.target.value)}
                type="number"
                size="small"
                autoFocus={!presetSaleId}
                helperText="El número interno de la venta, no el folio del ticket."
                sx={{ width: { sm: 260 } }}
              />
              <Button type="submit" variant="contained" disabled={loading || !saleIdInput.trim()} sx={{ minHeight: 40 }}>
                {loading ? 'Buscando…' : 'Buscar venta'}
              </Button>
            </Stack>
            {lookupError ? (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setLookupError(null)}>
                {lookupError}
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        {sale ? (
          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6">Venta {sale.folio ?? `#${sale.id}`}</Typography>
                  {isVoided ? <Chip label="Cancelada" color="error" size="small" /> : null}
                  <Typography variant="body2" color="text.secondary">
                    {new Date(sale.date).toLocaleString('es-MX')} · Total {money(sale.total)}
                  </Typography>
                </Stack>

                {isVoided ? <Alert severity="warning">Esta venta fue cancelada, por lo que no admite devoluciones.</Alert> : null}

                {!isVoided ? (
                  <Stack component="ul" divider={<Box sx={{ borderTop: '1px solid var(--mui-palette-divider)' }} />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                    <Stack direction="row" justifyContent="flex-end" sx={{ pb: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setLines((prev) => prev.map((l) => ({ ...l, quantity: l.sold })))}
                      >
                        Devolver todo
                      </Button>
                    </Stack>
                    {lines.map((line) => (
                      <Stack key={line.saleItemId} component="li" direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ py: 1.5 }}>
                        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {line.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {line.sku} · {money(line.unitPrice)} c/u · se vendieron {line.sold}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" role="group" aria-label={`Piezas a devolver de ${line.description}`}>
                          <IconButton
                            aria-label="Devolver una menos"
                            disabled={line.quantity <= 0}
                            onClick={() => setQuantity(line.saleItemId, line.quantity - 1)}
                            sx={{ width: 40, height: 40, border: '1px solid var(--mui-palette-divider)' }}
                          >
                            <MinusIcon />
                          </IconButton>
                          <Typography sx={{ minWidth: 56, textAlign: 'center' }} fontWeight={700}>
                            {line.quantity} / {line.sold}
                          </Typography>
                          <IconButton
                            aria-label="Devolver una más"
                            disabled={line.quantity >= line.sold}
                            onClick={() => setQuantity(line.saleItemId, line.quantity + 1)}
                            sx={{ width: 40, height: 40, border: '1px solid var(--mui-palette-divider)' }}
                          >
                            <PlusIcon />
                          </IconButton>
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                ) : null}

                {!isVoided ? (
                  <>
                    <TextField
                      label="Motivo de la devolución (opcional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      multiline
                      minRows={2}
                    />

                    {submitError ? (
                      <Alert
                        severity="error"
                        onClose={() => setSubmitError(null)}
                        action={
                          !cashRegisterId ? (
                            <Button color="inherit" size="small" component={RouterLink} href={paths.dashboard.sales}>
                              Ir a Punto de Venta
                            </Button>
                          ) : undefined
                        }
                      >
                        {submitError}
                      </Alert>
                    ) : null}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Reembolso aproximado
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {money(estimatedRefund)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          El monto final lo calcula el sistema (considera descuentos).
                        </Typography>
                      </Box>
                      <Stack spacing={0.5} alignItems={{ sm: 'flex-end' }}>
                        <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting || items.length === 0} sx={{ minHeight: 48 }}>
                          {submitting ? 'Procesando…' : 'Registrar devolución'}
                        </Button>
                        {hint ? (
                          <Typography variant="caption" color="text.secondary" role="status">
                            {hint}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>

      <Snackbar open={toast !== null} autoHideDuration={8000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
