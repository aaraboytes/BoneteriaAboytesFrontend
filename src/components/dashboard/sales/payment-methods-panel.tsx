'use client';

import * as React from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

export interface PaymentMethodOption {
  id: number;
  name: string;
  isActive: boolean;
}

export interface PaymentLine {
  key: string;
  paymentMethodId: number | '';
  amount: string;
  receivedAmount: string;
}

export interface PaymentMethodsPanelProps {
  methods: PaymentMethodOption[];
  payments: PaymentLine[];
  onChange: (payments: PaymentLine[]) => void;
}

function isCashMethod(methods: PaymentMethodOption[], paymentMethodId: number | ''): boolean {
  const method = methods.find((m) => m.id === paymentMethodId);
  return Boolean(method?.name?.toLowerCase().includes('efectivo') || method?.name?.toLowerCase().includes('cash'));
}

export function PaymentMethodsPanel({ methods, payments, onChange }: PaymentMethodsPanelProps): React.JSX.Element {
  const addPayment = (): void => {
    onChange([
      ...payments,
      { key: `${Date.now()}-${Math.random()}`, paymentMethodId: methods[0]?.id ?? '', amount: '', receivedAmount: '' },
    ]);
  };

  const updatePayment = (key: string, changes: Partial<PaymentLine>): void => {
    onChange(payments.map((p) => (p.key === key ? { ...p, ...changes } : p)));
  };

  const removePayment = (key: string): void => {
    onChange(payments.filter((p) => p.key !== key));
  };

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalChange = payments.reduce((sum, p) => {
    const amount = parseFloat(p.amount) || 0;
    const received = parseFloat(p.receivedAmount) || 0;
    return sum + Math.max(0, received - amount);
  }, 0);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Pagos</Typography>
      {payments.map((payment) => {
        const cash = isCashMethod(methods, payment.paymentMethodId);
        const change = cash ? Math.max(0, (parseFloat(payment.receivedAmount) || 0) - (parseFloat(payment.amount) || 0)) : 0;
        return (
          <Stack key={payment.key} spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                size="small"
                label="Método"
                value={payment.paymentMethodId}
                onChange={(e) => updatePayment(payment.key, { paymentMethodId: Number(e.target.value) })}
                sx={{ width: 150 }}
              >
                {methods.map((method) => (
                  <MenuItem key={method.id} value={method.id}>
                    {method.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                size="small"
                label="Monto"
                value={payment.amount}
                onChange={(e) => updatePayment(payment.key, { amount: e.target.value })}
                sx={{ width: 110 }}
                inputProps={{ step: '0.01', min: 0 }}
              />
              {cash ? (
                <TextField
                  type="number"
                  size="small"
                  label="Recibido"
                  value={payment.receivedAmount}
                  onChange={(e) => updatePayment(payment.key, { receivedAmount: e.target.value })}
                  sx={{ width: 110 }}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              ) : null}
              <IconButton size="small" onClick={() => removePayment(payment.key)}>
                <TrashIcon />
              </IconButton>
            </Stack>
            {cash && change > 0 ? (
              <Typography variant="caption" color="success.main" sx={{ pl: 0.5 }}>
                Cambio de esta línea: ${change.toFixed(2)}
              </Typography>
            ) : null}
          </Stack>
        );
      })}
      <Button size="small" startIcon={<PlusIcon />} onClick={addPayment} sx={{ alignSelf: 'flex-start' }}>
        Agregar pago
      </Button>
      <Typography variant="body2" color="text.secondary">
        Total pagado: ${totalPaid.toFixed(2)}
        {totalChange > 0 ? ` · Cambio total: $${totalChange.toFixed(2)}` : ''}
      </Typography>
    </Stack>
  );
}
