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
import Snackbar from '@mui/material/Snackbar';
import apiClient from '@/lib/api-client';
import { getSelectedCashRegisterId, getStoredCashier, setSelectedCashRegisterId, storeCashier } from '@/lib/pos/cash-register-storage';

import { ProductSearchField, type VariantOption } from './product-search-field';
import { CartTable, type CartLine } from './cart-table';
import { PaymentMethodsPanel, type PaymentMethodOption, type PaymentLine } from './payment-methods-panel';
import { SaleReceiptDialog, type CompletedSale } from './sale-receipt-dialog';
import { CashOpeningDialog } from './cash-opening-dialog';
import { CashMovementDialog } from './cash-movement-dialog';
import { CashClosingDialog } from './cash-closing-dialog';
import { CashierSwitchDialog, type CashierTicket } from './cashier-switch-dialog';
import { CustomerPicker, type CustomerOption } from './customer-picker';

interface CashRegisterOption {
  id: number;
  name: string;
  storeId: number;
  storeName: string;
}

interface CashStatus {
  hasOpenSession: boolean;
  requiresPriorClosing: boolean;
  session: { id: number; openedAt: string; openedBy: string | null; openingAmount: number } | null;
  cashInDrawer: number | null;
}

// Server-side pricing of the cart (POST /Sales/preview): the same numbers the sale will charge.
interface SalePreview {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  priceIncludesTax: boolean;
  couponError: string | null;
  discounts: { amount: number; reason: string }[];
}

interface SaleResult {
  id: number;
  folio: string | null;
  date: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  saleItems: { description: string | null; sku: string | null; unitPrice: number; quantity: number }[];
  payments: { paymentMethodId: number; amount: number; receivedAmount: number | null; changeGiven: number | null }[];
}

export function PosSalesWorkspace(): React.JSX.Element {
  // Several cashiers share this device's drawer; each identifies before charging (cashier switch).
  const [registers, setRegisters] = React.useState<CashRegisterOption[]>([]);
  const [registerId, setRegisterId] = React.useState<number | ''>('');
  // The cashier identifies once per shift; null asks again on the next charge.
  const [cashier, setCashier] = React.useState<CashierTicket | null>(null);
  // 'charge' = identify and then charge; 'switch' = only change the active cashier.
  const [cashierDialog, setCashierDialog] = React.useState<'charge' | 'switch' | null>(null);
  const [customer, setCustomer] = React.useState<CustomerOption | null>(null);
  const customerId = customer?.id;
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = React.useState('');
  // The coupon sent to the preview and the sale (set by "Validar").
  const [appliedCoupon, setAppliedCoupon] = React.useState('');
  const [preview, setPreview] = React.useState<SalePreview | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethodOption[]>([]);
  const [payments, setPayments] = React.useState<PaymentLine[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completedSale, setCompletedSale] = React.useState<CompletedSale | null>(null);

  const [cashStatus, setCashStatus] = React.useState<CashStatus | null>(null);
  const [cashStatusLoading, setCashStatusLoading] = React.useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = React.useState(false);
  const [closingDialogOpen, setClosingDialogOpen] = React.useState(false);
  const [openingDialogOpen, setOpeningDialogOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const handleSuccessMessage = (message: string): void => {
    setToast(message);
  };

  const register = registers.find((r) => r.id === registerId);
  const storeId = register?.storeId ?? '';
  const registerLabel = register ? `${register.name} · ${register.storeName}` : '';

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<CashRegisterOption[]>('/CashRegisters');
        if (Array.isArray(res.data)) {
          setRegisters(res.data);
          const remembered = getSelectedCashRegisterId();
          const initial = res.data.find((r) => r.id === remembered) ?? res.data[0];
          if (initial) setRegisterId(initial.id);
        }
      } catch (err) {
        console.error('Failed to fetch cash registers', err);
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

  const fetchCashStatus = React.useCallback(async (): Promise<void> => {
    if (!registerId) return;
    setCashStatusLoading(true);
    try {
      const res = await apiClient.get<CashStatus>('/CashSessions/current', { params: { cashRegisterId: registerId } });
      setCashStatus(res.data);
      // Prompt for an opening automatically the first time this drawer is found to need one
      // (page load, or switching to it); the user can dismiss it and reopen later via the
      // blocking panel's button, but they still can't transact until it's actually done.
      setOpeningDialogOpen(!res.data.hasOpenSession && !res.data.requiresPriorClosing);
    } catch (err) {
      console.error('Failed to fetch cash register status', err);
    } finally {
      setCashStatusLoading(false);
    }
  }, [registerId]);

  React.useEffect(() => {
    fetchCashStatus();
  }, [fetchCashStatus]);

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  // Re-price on the server whenever the cart, coupon or customer changes (debounced).
  React.useEffect(() => {
    if (!registerId || cart.length === 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.post<SalePreview>(
          '/Sales/preview',
          {
            customerId,
            couponCode: appliedCoupon || undefined,
            saleItems: cart.map((line) => ({
              productVariantId: line.productVariantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
          { params: { cashRegisterId: registerId } }
        );
        setPreview(res.data);
        setPreviewError(null);
      } catch (err: any) {
        setPreview(null);
        setPreviewError(err?.response?.data?.message || 'No se pudo calcular el total.');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cart, appliedCoupon, customerId, registerId]);

  // What must be paid: the server's total once known.
  const amountDue = preview?.total ?? subtotal;
  const totalReceived = payments.reduce((sum, p) => sum + (p.paymentMethodId !== '' ? parseFloat(p.receivedAmount) || 0 : 0), 0);

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
          stockQuantity: option.stockQuantity,
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

  // The preview validates the coupon and applies it to the total.
  const handleValidateCoupon = (): void => {
    setAppliedCoupon(couponCode.trim());
  };

  const couponDiscount = preview?.discounts.find((d) => d.reason.startsWith('Cupón'));
  const couponMessage: { severity: 'success' | 'error'; text: string } | null = !appliedCoupon
    ? null
    : preview?.couponError
      ? { severity: 'error', text: preview.couponError }
      : couponDiscount
        ? { severity: 'success', text: `Cupón aplicado: -$${couponDiscount.amount.toFixed(2)}` }
        : null;

  const resetForm = (): void => {
    setCart([]);
    setCouponCode('');
    setAppliedCoupon('');
    setPreview(null);
    setPayments([]);
    setCustomer(null);
  };

  // Restore this drawer's cashier when the drawer changes or the page reloads.
  React.useEffect(() => {
    setCashier(registerId ? getStoredCashier(registerId) : null);
  }, [registerId]);

  const changeCashier = (next: CashierTicket | null): void => {
    setCashier(next);
    if (registerId) storeCashier(registerId, next);
  };

  const handleCharge = (): void => {
    if (!registerId) {
      setError('Seleccione una caja.');
      return;
    }
    if (cart.length === 0) {
      setError('Agregue al menos un producto al carrito.');
      return;
    }
    if (!preview || previewError) {
      setError(previewError || 'Calculando el total, intenta de nuevo.');
      return;
    }
    if (preview.couponError) {
      setError(preview.couponError);
      return;
    }
    // Full payment is required.
    if (totalReceived + 0.005 < preview.total) {
      setError(`Pago insuficiente: faltan $${(preview.total - totalReceived).toFixed(2)}.`);
      return;
    }
    setError(null);
    if (cashier) {
      handleSubmit(cashier);
    } else {
      setCashierDialog('charge');
    }
  };

  const handleCashierAuthenticated = (next: CashierTicket): void => {
    const mode = cashierDialog;
    setCashierDialog(null);
    changeCashier(next);
    if (mode === 'charge') handleSubmit(next);
  };

  const handleSubmit = async (cashier: CashierTicket): Promise<void> => {
    setError(null);
    setSubmitting(true);
    try {
      // Each line only asks for the amount received via that method. The amount applied toward
      // the sale is whatever is still owed when that line is reached (in the order entered);
      // anything beyond that is change. Split against the server's total from the preview.
      let remainingDue = amountDue;
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

      // Store, drawer session and cashier come from the cashier ticket on the server.
      const payload = {
        customerId,
        couponCode: appliedCoupon || undefined,
        saleItems: cart.map((line) => ({
          productVariantId: line.productVariantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        payments: paymentsPayload,
      };

      const res = await apiClient.post<SaleResult>('/Sales', payload, { headers: { 'X-Cashier-Ticket': cashier.ticket } });
      const sale = res.data;

      // The receipt shows what the server saved: its lines, totals and payments (with change).
      setCompletedSale({
        id: sale.id,
        folio: sale.folio ?? undefined,
        cashierName: cashier.employeeName,
        date: sale.date,
        storeName: register?.storeName ?? '',
        items: sale.saleItems.map((line) => ({
          description: line.description ?? '',
          sku: line.sku ?? '',
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
        subtotal: sale.subtotal,
        taxTotal: sale.taxTotal,
        discountTotal: sale.discountTotal,
        total: sale.total,
        payments: sale.payments.map((p) => ({
          methodName: paymentMethods.find((m) => m.id === p.paymentMethodId)?.name ?? 'Pago',
          amount: p.amount,
          receivedAmount: p.receivedAmount ?? undefined,
          changeGiven: p.changeGiven ?? undefined,
        })),
        totalReceived: sale.payments.reduce((sum, p) => sum + (p.receivedAmount ?? p.amount), 0),
        totalChange: sale.payments.reduce((sum, p) => sum + (p.changeGiven ?? 0), 0),
      });
      resetForm();
      setToast(`Venta ${sale.folio ?? `#${sale.id}`} registrada por ${cashier.employeeName}.`);
      fetchCashStatus();
    } catch (err: any) {
      console.error('Failed to create sale', err);
      setError(err?.response?.data?.message || 'Error al procesar la venta.');
      const code = err?.response?.data?.code;
      if (code === 'NO_CASH_SESSION' || code === 'STALE_CASH_SESSION') {
        fetchCashStatus();
      }
      // The cashier's ticket ended (drawer reopened, user deactivated, or expired): identify again.
      if (code === 'CASHIER_TICKET_EXPIRED' || code === 'CASHIER_TICKET_REQUIRED') {
        changeCashier(null);
        setCashierDialog('charge');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canTransact = cashStatus?.hasOpenSession ?? false;

  // Why "Cobrar" can't be pressed yet, shown next to the button instead of as an error after the click.
  const missingPayment = Math.max(0, (preview?.total ?? 0) - totalReceived);
  const chargeHint: string | null =
    cart.length === 0
      ? 'Agrega productos para cobrar.'
      : !preview
        ? previewError
          ? null
          : 'Calculando el total…'
        : payments.length === 0
          ? 'Elige una forma de pago.'
          : missingPayment > 0.005
            ? `Falta cobrar $${missingPayment.toFixed(2)}.`
            : null;
  const readyToCharge = chargeHint === null && !submitting && !previewError;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Typography variant="h4" component="h2">
            Punto de Venta
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Caja"
              value={registerId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setRegisterId(id);
                setSelectedCashRegisterId(id);
                setCart([]);
              }}
              sx={{ minWidth: 240 }}
            >
              {registers.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} · {r.storeName}
                </MenuItem>
              ))}
            </TextField>
            {canTransact ? (
              <>
                <Button variant="outlined" onClick={() => setMovementDialogOpen(true)}>
                  Entrada / salida de efectivo
                </Button>
                <Button variant="outlined" color="warning" onClick={() => setClosingDialogOpen(true)}>
                  Cerrar caja
                </Button>
              </>
            ) : null}
          </Stack>
        </Stack>

        {canTransact && cashStatus?.session ? (
          <Card variant="outlined">
            <CardContent sx={{ py: '12px !important' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }} alignItems={{ sm: 'center' }}>
                <Stack>
                  <Typography variant="caption" color="text.secondary">
                    Caja abierta
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    desde las {new Date(cashStatus.session.openedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {cashStatus.session.openedBy ? ` · ${cashStatus.session.openedBy}` : ''}
                  </Typography>
                </Stack>
                {cashStatus.cashInDrawer != null ? (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Efectivo en caja
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      ${cashStatus.cashInDrawer.toFixed(2)}
                    </Typography>
                  </Stack>
                ) : null}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: { sm: 'auto' } }}>
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Cajero
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={cashier ? 'text.primary' : 'warning.main'}>
                      {cashier ? cashier.employeeName : 'Sin identificar'}
                    </Typography>
                  </Stack>
                  <Button size="small" variant={cashier ? 'text' : 'contained'} onClick={() => setCashierDialog('switch')}>
                    {cashier ? 'Cambiar' : 'Identificarme'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {!canTransact && !cashStatusLoading ? (
          <Card>
            <CardContent>
              <Stack spacing={1} alignItems="center" sx={{ py: 6 }}>
                <Typography variant="h6">
                  {cashStatus?.requiresPriorClosing ? 'Hay una caja abierta de un día anterior' : 'La caja está cerrada'}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {cashStatus?.requiresPriorClosing
                    ? 'Cierra la caja pendiente para poder registrar ventas hoy.'
                    : 'Abre la caja con el efectivo inicial para empezar a vender.'}
                </Typography>
                {!cashStatus?.requiresPriorClosing && !openingDialogOpen ? (
                  <Button variant="contained" size="large" onClick={() => setOpeningDialogOpen(true)} sx={{ mt: 1 }}>
                    Abrir caja
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {canTransact ? (
          <Grid container spacing={3} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 7, lg: 8 }}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <ProductSearchField storeId={storeId} onSelect={handleAddToCart} />
                    <Divider />
                    <CartTable lines={cart} onUpdateLine={handleUpdateLine} onRemoveLine={handleRemoveLine} onClear={() => setCart([])} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 5, lg: 4 }} sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack spacing={0.5}>
                      <Typography variant="overline" color="text.secondary">
                        Total a cobrar
                      </Typography>
                      <Typography variant="h3" component="p" sx={{ fontWeight: 800 }}>
                        {preview ? `$${preview.total.toFixed(2)}` : cart.length ? `$${subtotal.toFixed(2)}` : '$0.00'}
                      </Typography>
                      {preview && (preview.discountTotal > 0 || preview.taxTotal > 0) ? (
                        <Typography variant="caption" color="text.secondary">
                          Subtotal ${preview.subtotal.toFixed(2)}
                          {preview.discountTotal > 0 ? ` · Descuentos -$${preview.discountTotal.toFixed(2)}` : ''}
                          {preview.taxTotal > 0 ? ` · ${preview.priceIncludesTax ? 'IVA incluido' : 'IVA'} $${preview.taxTotal.toFixed(2)}` : ''}
                        </Typography>
                      ) : null}
                    </Stack>

                    {previewError ? <Alert severity="error">{previewError}</Alert> : null}

                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Cupón de descuento"
                        size="small"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleValidateCoupon();
                        }}
                        fullWidth
                      />
                      <Button variant="outlined" onClick={handleValidateCoupon} disabled={!couponCode.trim()}>
                        Aplicar
                      </Button>
                    </Stack>
                    {couponMessage ? <Alert severity={couponMessage.severity}>{couponMessage.text}</Alert> : null}

                    <CustomerPicker value={customer} onChange={setCustomer} />

                    <Divider />

                    <PaymentMethodsPanel methods={paymentMethods} payments={payments} onChange={setPayments} amountDue={amountDue} />

                    <Stack spacing={0.75}>
                      <Button variant="contained" size="large" onClick={handleCharge} disabled={!readyToCharge} sx={{ minHeight: 56, fontSize: '1.0625rem' }}>
                        {submitting ? 'Procesando…' : preview ? `Cobrar $${preview.total.toFixed(2)}` : 'Cobrar'}
                      </Button>
                      {chargeHint ? (
                        <Typography variant="caption" color="text.secondary" textAlign="center" role="status">
                          {chargeHint}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}
      </Stack>

      {registerId && cashStatus && !cashStatus.hasOpenSession && !cashStatus.requiresPriorClosing ? (
        <CashOpeningDialog
          open={openingDialogOpen}
          cashRegisterId={registerId}
          registerLabel={registerLabel}
          onOpened={fetchCashStatus}
          onClose={() => setOpeningDialogOpen(false)}
        />
      ) : null}

      {registerId && cashStatus?.requiresPriorClosing && cashStatus.session ? (
        <CashClosingDialog
          open
          forced
          sessionId={cashStatus.session.id}
          registerLabel={registerLabel}
          onClose={() => {}}
          onClosed={() => {
            changeCashier(null);
            fetchCashStatus();
          }}
        />
      ) : null}

      {registerId && cashStatus?.session && !cashStatus.requiresPriorClosing ? (
        <CashClosingDialog
          open={closingDialogOpen}
          sessionId={cashStatus.session.id}
          registerLabel={registerLabel}
          onClose={() => setClosingDialogOpen(false)}
          onClosed={() => {
            setClosingDialogOpen(false);
            changeCashier(null);
            fetchCashStatus();
          }}
        />
      ) : null}

      {cashStatus?.session && canTransact ? (
        <CashMovementDialog
          open={movementDialogOpen}
          sessionId={cashStatus.session.id}
          cashInDrawer={cashStatus.cashInDrawer}
          onClose={() => setMovementDialogOpen(false)}
          onSuccess={(message) => {
            setMovementDialogOpen(false);
            handleSuccessMessage(message);
            fetchCashStatus();
          }}
        />
      ) : null}

      {registerId ? (
        <CashierSwitchDialog
          open={cashierDialog !== null}
          cashRegisterId={registerId}
          amountDue={cashierDialog === 'charge' ? amountDue : undefined}
          onAuthenticated={handleCashierAuthenticated}
          onClose={() => setCashierDialog(null)}
        />
      ) : null}

      <SaleReceiptDialog open={completedSale !== null} sale={completedSale} onClose={() => setCompletedSale(null)} />

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToast(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
