'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

export interface PaymentMethodOption {
  id: number;
  name: string;
  isActive: boolean;
}

export interface PaymentLine {
  key: string;
  paymentMethodId: number | '';
  receivedAmount: string;
  // Set when the amount was already collected on a Mercado Pago terminal (the line is then locked).
  mercadoPagoOrderId?: string;
}

export interface PaymentMethodsPanelProps {
  methods: PaymentMethodOption[];
  payments: PaymentLine[];
  onChange: (payments: PaymentLine[]) => void;
  amountDue: number;
  // Called instead of adding a line when the cashier picks Mercado Pago: charge this amount on the terminal.
  onMercadoPago?: (methodId: number, amount: number) => void;
  // Gives back a Mercado Pago charge that was collected but not sold yet.
  onRefundMercadoPago?: (payment: PaymentLine) => void;
}

const BILLS = [100, 200, 500];
const isMercadoPago = (name: string | undefined): boolean => /mercado\s*pago/i.test(name ?? '');
const isCash = (name: string | undefined): boolean => /efectivo|cash/i.test(name ?? '');
const money = (n: number): string => `$${n.toFixed(2)}`;

export function PaymentMethodsPanel({ methods, payments, onChange, amountDue, onMercadoPago, onRefundMercadoPago }: PaymentMethodsPanelProps): React.JSX.Element {
  const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.receivedAmount) || 0), 0);
  const remaining = Math.max(0, amountDue - totalReceived);
  const change = Math.max(0, totalReceived - amountDue);
  const canPay = amountDue > 0;

  // Picking a method adds a line already filled with what is still owed.
  const addPayment = (methodId: number): void => {
    onChange([
      ...payments,
      { key: `${Date.now()}-${Math.random()}`, paymentMethodId: methodId, receivedAmount: remaining > 0 ? remaining.toFixed(2) : '' },
    ]);
  };

  const updatePayment = (key: string, changes: Partial<PaymentLine>): void => {
    onChange(payments.map((p) => (p.key === key ? { ...p, ...changes } : p)));
  };

  const removePayment = (key: string): void => {
    onChange(payments.filter((p) => p.key !== key));
  };

  const activeMethods = methods.filter((m) => m.isActive !== false);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">Forma de pago</Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap role="group" aria-label="Agregar forma de pago">
        {activeMethods.map((method) => (
          <Button key={method.id} variant="outlined" size="medium" disabled={!canPay} onClick={() => (onMercadoPago && isMercadoPago(method.name) ? onMercadoPago(method.id, remaining) : addPayment(method.id))} sx={{ minHeight: 44 }}>
            {method.name}
          </Button>
        ))}
      </Stack>
      {!canPay ? (
        <Typography variant="caption" color="text.secondary">
          Agrega productos para elegir cómo cobrar.
        </Typography>
      ) : null}

      {payments.map((payment) => {
        const method = methods.find((m) => m.id === payment.paymentMethodId);
        const received = parseFloat(payment.receivedAmount) || 0;
        return (
          <Box key={payment.key} sx={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 1, p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600} sx={{ flex: '1 1 auto' }}>
                {method?.name ?? 'Pago'}
              </Typography>
              <TextField
                type="number"
                size="small"
                label="Monto recibido"
                disabled={Boolean(payment.mercadoPagoOrderId)}
                value={payment.receivedAmount}
                onChange={(e) => updatePayment(payment.key, { receivedAmount: e.target.value })}
                slotProps={{
                  htmlInput: { step: '0.01', min: 0 },
                  input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                }}
                sx={{ width: 150 }}
              />
              {payment.mercadoPagoOrderId && onRefundMercadoPago ? (
                <Button size="small" color="error" onClick={() => onRefundMercadoPago(payment)}>
                  Reembolsar
                </Button>
              ) : null}
              <IconButton
                aria-label={`Quitar pago con ${method?.name ?? 'método'}`}
                disabled={Boolean(payment.mercadoPagoOrderId)}
                title={payment.mercadoPagoOrderId ? 'Ya cobrado en la terminal; no se puede quitar' : undefined}
                onClick={() => removePayment(payment.key)}
              >
                <TrashIcon />
              </IconButton>
            </Stack>
            {isCash(method?.name) ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label="Exacto"
                  clickable
                  color={Math.abs(received - (amountDue - (totalReceived - received))) < 0.005 ? 'primary' : 'default'}
                  onClick={() => updatePayment(payment.key, { receivedAmount: Math.max(0, amountDue - (totalReceived - received)).toFixed(2) })}
                />
                {BILLS.map((bill) => (
                  <Chip key={bill} size="small" label={`$${bill}`} clickable onClick={() => updatePayment(payment.key, { receivedAmount: String(bill) })} />
                ))}
              </Stack>
            ) : null}
          </Box>
        );
      })}

      {payments.length > 0 ? (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          role="status"
          sx={{ bgcolor: remaining > 0.005 ? 'rgba(237, 108, 2, 0.12)' : 'rgba(46, 125, 50, 0.12)', borderRadius: 1, px: 1.5, py: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            Recibido {money(totalReceived)}
          </Typography>
          {remaining > 0.005 ? (
            <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
              Falta {money(remaining)}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={700} color="success.dark">
              {change > 0 ? `Cambio ${money(change)}` : 'Pagado completo'}
            </Typography>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
