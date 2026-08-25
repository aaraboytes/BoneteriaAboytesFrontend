'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import apiClient from '@/lib/api-client';

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
  date: string;
  total: number;
  storeId?: number | null;
  saleItems: SaleItem[];
}

interface ReturnLineState {
  saleItemId: string;
  description: string;
  sold: number;
  returnQuantity: string;
}

interface ReturnResult {
  id: number;
  totalRefunded: number;
  items: Array<{ saleItemId: string; quantity: number; refundAmount: number }>;
}

export function ReturnsWorkspace(): React.JSX.Element {
  const [saleIdInput, setSaleIdInput] = React.useState('');
  const [sale, setSale] = React.useState<SaleDetail | null>(null);
  const [lines, setLines] = React.useState<ReturnLineState[]>([]);
  const [reason, setReason] = React.useState('');
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const handleLookup = async (): Promise<void> => {
    const id = saleIdInput.trim();
    if (!id) return;
    setLookupError(null);
    setSale(null);
    setLoading(true);
    try {
      const res = await apiClient.get<SaleDetail>(`/Sales/${id}`);
      setSale(res.data);
      setLines(
        res.data.saleItems.map((item) => ({
          saleItemId: item.id,
          description: `${item.productVariant?.product?.description ?? 'Producto'} (${item.productVariant?.sku ?? item.productVariantId})`,
          sold: item.quantity,
          returnQuantity: '0',
        }))
      );
      setReason('');
    } catch (err: any) {
      console.error('Failed to look up sale', err);
      setLookupError(err?.response?.status === 404 ? 'Venta no encontrada.' : 'Error al buscar la venta.');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (saleItemId: string, returnQuantity: string): void => {
    setLines((prev) => prev.map((line) => (line.saleItemId === saleItemId ? { ...line, returnQuantity } : line)));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!sale) return;
    const items = lines
      .map((line) => ({ saleItemId: line.saleItemId, quantity: parseFloat(line.returnQuantity) || 0 }))
      .filter((line) => line.quantity > 0);

    if (items.length === 0) {
      setSubmitError('Indique al menos una cantidad a devolver.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post<ReturnResult>('/SaleReturns', {
        saleId: sale.id,
        reason: reason.trim() || undefined,
        items,
      });
      setToast({ open: true, message: `Devolución #${res.data.id} registrada. Total reembolsado: $${res.data.totalRefunded.toFixed(2)}` });
      setSale(null);
      setLines([]);
      setSaleIdInput('');
    } catch (err: any) {
      console.error('Failed to create return', err);
      setSubmitError(err?.response?.data?.message || 'Error al procesar la devolución.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Devoluciones</Typography>

        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="ID de Venta"
                value={saleIdInput}
                onChange={(e) => setSaleIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                type="number"
                size="small"
                sx={{ width: 200 }}
              />
              <Button variant="outlined" onClick={handleLookup} disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
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
              <Stack spacing={2}>
                <Typography variant="subtitle1">
                  Venta #{sale.id} · Total: ${sale.total.toFixed(2)} · {new Date(sale.date).toLocaleString('es-MX')}
                </Typography>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Vendido</TableCell>
                      <TableCell align="right">Cantidad a devolver</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.saleItemId}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell align="right">{line.sold}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={line.returnQuantity}
                            onChange={(e) => updateLine(line.saleItemId, e.target.value)}
                            inputProps={{ min: 0, max: line.sold, step: '1' }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Divider />

                <TextField
                  label="Motivo de la devolución"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  multiline
                  minRows={2}
                />

                {submitError ? (
                  <Alert severity="error" onClose={() => setSubmitError(null)}>
                    {submitError}
                  </Alert>
                ) : null}

                <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
                  {submitting ? 'Procesando...' : 'Registrar Devolución'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((p) => ({ ...p, open: false }))}
          severity="success"
          variant="filled"
          sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
