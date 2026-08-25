'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import apiClient from '@/lib/api-client';
import { useUser } from '@/hooks/use-user';

import { ProductSearchField, type VariantOption } from './product-search-field';
import { CartTable, type CartLine } from './cart-table';
import { PaymentMethodsPanel, type PaymentMethodOption, type PaymentLine } from './payment-methods-panel';
import { SaleReceiptDialog, type CompletedSale } from './sale-receipt-dialog';

interface StoreOption {
  id: number;
  name: string;
}

interface SaleResult {
  id: number;
  date: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
}

export function PosSalesWorkspace(): React.JSX.Element {
  const { user } = useUser();

  const [stores, setStores] = React.useState<StoreOption[]>([]);
  const [storeId, setStoreId] = React.useState<number | ''>('');
  const [customerId, setCustomerId] = React.useState('');
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = React.useState('');
  const [couponMessage, setCouponMessage] = React.useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethodOption[]>([]);
  const [payments, setPayments] = React.useState<PaymentLine[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completedSale, setCompletedSale] = React.useState<CompletedSale | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/Stores');
        if (Array.isArray(res.data)) {
          setStores(res.data);
          if (res.data.length > 0) setStoreId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch stores', err);
      }
    })();

    (async () => {
      try {
        const res = await apiClient.get('/Payments');
        if (Array.isArray(res.data)) setPaymentMethods(res.data);
      } catch (err) {
        console.error('Failed to fetch payment methods', err);
      }
    })();
  }, []);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const handleAddToCart = (option: VariantOption): void => {
    setCart((prev) => {
      const existing = prev.find((line) => line.productVariantId === option.productVariantId);
      if (existing) {
        return prev.map((line) =>
          line.productVariantId === option.productVariantId ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          productVariantId: option.productVariantId,
          description: option.description,
          sku: option.sku,
          unitPrice: option.unitPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateLine = (productVariantId: string, changes: Partial<Pick<CartLine, 'unitPrice' | 'quantity'>>): void => {
    setCart((prev) => prev.map((line) => (line.productVariantId === productVariantId ? { ...line, ...changes } : line)));
  };

  const handleRemoveLine = (productVariantId: string): void => {
    setCart((prev) => prev.filter((line) => line.productVariantId !== productVariantId));
  };

  const handleValidateCoupon = async (): Promise<void> => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiClient.get(
        `/Discounts/validate?code=${encodeURIComponent(couponCode.trim())}&saleTotal=${subtotal}`
      );
      const rule = res.data;
      const amountText = rule.isPercentage ? `${rule.value}%` : `$${rule.value}`;
      setCouponMessage({ severity: 'success', text: `Cupón válido: ${amountText} de descuento` });
    } catch (err: any) {
      setCouponMessage({ severity: 'error', text: err?.response?.data?.message || 'Cupón inválido' });
    }
  };

  const resetForm = (): void => {
    setCart([]);
    setCouponCode('');
    setCouponMessage(null);
    setPayments([]);
    setCustomerId('');
  };

  const handleSubmit = async (): Promise<void> => {
    if (!storeId) {
      setError('Seleccione una sucursal.');
      return;
    }
    if (cart.length === 0) {
      setError('Agregue al menos un producto al carrito.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // Each line only asks for the amount received via that method. The amount actually
      // applied toward the sale is whatever is still owed when that line is reached (in the
      // order entered); anything beyond that is change. This is only an estimate against the
      // pre-tax subtotal - the real total (with tax/discount) isn't known until the backend
      // responds, so the receipt dialog recomputes the change shown to the customer from the
      // actual returned total rather than trusting this estimate.
      let remainingDue = subtotal;
      const paymentsPayload = payments
        .filter((p) => p.paymentMethodId !== '' && (parseFloat(p.receivedAmount) || 0) > 0)
        .map((p) => {
          const received = parseFloat(p.receivedAmount) || 0;
          const amount = Math.min(received, Math.max(0, remainingDue));
          const changeGiven = received > amount ? received - amount : undefined;
          remainingDue -= amount;
          return {
            paymentMethodId: p.paymentMethodId as number,
            amount,
            receivedAmount: received,
            changeGiven,
          };
        });

      const payload = {
        storeId,
        customerId: customerId ? Number(customerId) : undefined,
        employeeId: typeof user?.id === 'number' ? user.id : undefined,
        couponCode: couponCode.trim() || undefined,
        saleItems: cart.map((line) => ({
          productVariantId: line.productVariantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        payments: paymentsPayload,
      };

      const res = await apiClient.post<SaleResult>('/Sales', payload);
      const sale = res.data;

      const storeName = stores.find((s) => s.id === storeId)?.name ?? '';
      const totalReceived = paymentsPayload.reduce((sum, p) => sum + p.receivedAmount, 0);
      // Recomputed from the backend's actual total (tax/discount included) rather than the
      // pre-submission subtotal estimate used to split the payment lines above.
      const totalChange = Math.max(0, totalReceived - sale.total);

      setCompletedSale({
        id: sale.id,
        date: sale.date,
        storeName,
        items: cart.map((line) => ({
          description: line.description,
          sku: line.sku,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
        subtotal: sale.subtotal,
        taxTotal: sale.taxTotal,
        discountTotal: sale.discountTotal,
        total: sale.total,
        payments: paymentsPayload.map((p) => ({
          methodName: paymentMethods.find((m) => m.id === p.paymentMethodId)?.name ?? 'Pago',
          amount: p.amount,
          receivedAmount: p.receivedAmount,
          changeGiven: p.changeGiven,
        })),
        totalReceived,
        totalChange,
      });
      resetForm();
    } catch (err: any) {
      console.error('Failed to create sale', err);
      setError(err?.response?.data?.message || 'Error al procesar la venta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Punto de Venta</Typography>

        {error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Sucursal"
                      value={storeId}
                      onChange={(e) => setStoreId(Number(e.target.value))}
                      sx={{ width: 220 }}
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.id} value={store.id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="ID Cliente (opcional)"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      type="number"
                      sx={{ width: 200 }}
                    />
                  </Stack>

                  <ProductSearchField storeId={storeId} onSelect={handleAddToCart} />

                  <Divider />

                  <CartTable lines={cart} onUpdateLine={handleUpdateLine} onRemoveLine={handleRemoveLine} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Código de cupón"
                      size="small"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      fullWidth
                    />
                    <Button variant="outlined" onClick={handleValidateCoupon}>
                      Validar
                    </Button>
                  </Stack>
                  {couponMessage ? <Alert severity={couponMessage.severity}>{couponMessage.text}</Alert> : null}

                  <Divider />

                  <PaymentMethodsPanel methods={paymentMethods} payments={payments} onChange={setPayments} amountDue={subtotal} />

                  <Divider />

                  <Typography variant="h6">Subtotal: ${subtotal.toFixed(2)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Impuestos y descuentos finales se calculan al confirmar la venta.
                  </Typography>

                  <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Procesando...' : 'Cobrar'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>

      <SaleReceiptDialog open={completedSale !== null} sale={completedSale} onClose={() => setCompletedSale(null)} />
    </Box>
  );
}
