import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Divider,
  Box,
  Grid,
} from '@mui/material';

export interface CheckoutRequest {
  cash: number;
  credit: number;
  debit: number;
  discount: number;
}

export interface ChargeInfo {
  date: string;
  description: string;
  cost: number;
}

interface POSCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CheckoutRequest) => void;
  patientName: string;
  totalDebt: number; // positive value representing the debt
  recentCharges: ChargeInfo[];
}

export function POSCheckoutDialog({
  open,
  onClose,
  onConfirm,
  patientName,
  totalDebt,
  recentCharges,
}: POSCheckoutDialogProps): React.JSX.Element {
  const [cashAmount, setCashAmount] = React.useState<string>('');
  const [creditAmount, setCreditAmount] = React.useState<string>('');
  const [debitAmount, setDebitAmount] = React.useState<string>('');
  const [discount, setDiscount] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      setCashAmount('');
      setCreditAmount('');
      setDebitAmount('');
      setDiscount('');
    }
  }, [open]);

  const totalPayment = (parseFloat(cashAmount) || 0) + (parseFloat(creditAmount) || 0) + (parseFloat(debitAmount) || 0) + (parseFloat(discount) || 0);
  const remainingDebt = Math.max(0, totalDebt - totalPayment);
  const newBalance = totalPayment > totalDebt ? totalPayment - totalDebt : 0;

  const handleSubmit = () => {
    onConfirm({
      cash: parseFloat(cashAmount) || 0,
      credit: parseFloat(creditAmount) || 0,
      debit: parseFloat(debitAmount) || 0,
      discount: parseFloat(discount) || 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Checkout - {patientName}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {recentCharges && recentCharges.length > 0 && (
            <Box sx={{ p: 2, bgcolor: 'var(--mui-palette-background-level1)', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Recent Unpaid Appointments</Typography>
              <Stack spacing={2}>
                {recentCharges.map((charge, index) => (
                  <Box key={index}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {new Date(charge.date).toLocaleString()}
                    </Typography>
                    <Box sx={{ mt: 0.5, pl: 2, borderLeft: '2px solid var(--mui-palette-divider)' }}>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {charge.description ? charge.description.split(',').map((s, idx) => (
                          <li key={idx}>
                            <Typography variant="body2">{s.trim()}</Typography>
                          </li>
                        )) : (
                          <li><Typography variant="body2" color="text.secondary">No services specified</Typography></li>
                        )}
                      </ul>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500, color: 'text.primary' }}>
                        Cost: ${charge.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}



          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" color="text.primary">
              {totalDebt === 0 ? 'Remaining Credit Balance:' : 'Debt:'}
            </Typography>
            <Typography variant="h6" color={totalDebt === 0 ? 'success.main' : 'error.main'}>
              {totalDebt === 0 && remainingDebt === 0 ? 'Positive (Paid with Balance)' : `$${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            </Typography>
          </Stack>

          <Grid size={{ xs: 12, sm: 12 }}>
            <TextField
              label="Discount ($)"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0, step: '0.01' }}
            />
          </Grid>
          {totalDebt > 0 ? (
            <>
              <Divider>Enter payment details</Divider>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    label="Cash Payment ($)"
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    label="Credit Card Payment ($)"
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 12 }}>
                  <TextField
                    label="Debit Card Payment ($)"
                    type="number"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </Grid>
              </Grid>
              <Divider />
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Total Payment:</Typography>
                  <Typography variant="subtitle2">${totalPayment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Remaining Debt:</Typography>
                  <Typography variant="subtitle2" color="error.main">${remainingDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                </Stack>
                {newBalance > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Added to Balance (Top-up):</Typography>
                    <Typography variant="subtitle2" color="success.main">${newBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                  </Stack>
                )}
              </Stack>
            </>
          ) : (
            <Box sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1 }}>
              <Typography variant="body2">
                This appointment was fully covered by the patient's existing positive balance.
                Please acknowledge the checkout to complete the visit.
              </Typography>
            </Box>
          )}

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={totalDebt > 0 && totalPayment <= 0}>
          {totalDebt === 0 ? 'Acknowledge Checkout' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
