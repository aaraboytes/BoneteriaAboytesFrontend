'use client';

import * as React from 'react';
import {
  Box,
  Typography,
  Stack,
  Autocomplete,
  TextField,
  CircularProgress,
  Grid,
  Card,
  CardActionArea,
  Avatar,
  Button
} from '@mui/material';
import { FirstAidKit, CurrencyDollar, Storefront, Wallet, Users as UsersIcon, Printer, Plus } from '@phosphor-icons/react/dist/ssr';
import apiClient from '@/lib/api-client';
import { LineItem } from './sales-client';
import { Debtor } from '../billing/debtors-queue';
import { POSCheckoutDialog, CheckoutRequest } from '../billing/pos-checkout-dialog';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
}

interface PosWorkspaceProps {
  onOpenManualTransaction: () => void;
  onOpenCloseSession: () => void;
  onOpenTransactionsHistory: () => void;
  selectedPatient: Patient | null;
  setSelectedPatient: React.Dispatch<React.SetStateAction<Patient | null>>;
  selectedDebtor?: Debtor | null;
  onCheckoutSuccess?: () => void;
}

export function PosWorkspace({
  onOpenManualTransaction,
  onOpenCloseSession,
  onOpenTransactionsHistory,
  selectedPatient,
  setSelectedPatient,
  selectedDebtor,
  onCheckoutSuccess
}: PosWorkspaceProps): React.JSX.Element {
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = React.useState(false);

  // Debt/Credit Calculations for POS checkout
  const hasCharges = selectedDebtor?.recentCharges && selectedDebtor.recentCharges.length > 0;
  const chargesTotal = selectedDebtor && hasCharges
    ? selectedDebtor.recentCharges!.reduce((sum, c) => sum + c.cost, 0)
    : 0;
  const currentBalance = selectedDebtor ? selectedDebtor.balance : 0;
  const netBalance = currentBalance - chargesTotal;
  const totalDebt = netBalance < 0 ? Math.abs(netBalance) : 0;
  const previousDebt = currentBalance < 0 ? Math.abs(currentBalance) : 0;
  const balanceApplied = currentBalance > 0 ? Math.min(chargesTotal, currentBalance) : 0;

  // Fetch Patients
  React.useEffect(() => {
    let active = true;
    if (searchTerm === '') {
      setPatients([]);
      return;
    }

    setLoadingPatients(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/Patients?query=${encodeURIComponent(searchTerm)}`);
        if (active) setPatients(res.data.items || []);
      } catch (err) {
        console.error('Failed to search patients', err);
      } finally {
        if (active) setLoadingPatients(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3, p: 1, bgcolor: '#0ea5e9', borderRadius: 2 }}>
      {/* Search Bar */}
      <Box sx={{ bgcolor: '#fff', borderRadius: 1 }}>
        <Autocomplete
          options={patients}
          getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
          filterOptions={(x) => x}
          value={selectedPatient}
          onInputChange={(_, value) => setSearchTerm(value)}
          onChange={(_, value) => setSelectedPatient(value)}
          loading={loadingPatients}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Patient name"
              variant="outlined"
              size="small"
              sx={{ '& fieldset': { border: 'none' } }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* Invoice Details Body */}
      <Box sx={{ flexGrow: 1, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedDebtor ? (() => {
          return (
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100%' }}>
              {/* Invoice items and checkout button */}
              <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                  <UsersIcon size={28} color="var(--mui-palette-text-primary)" weight="duotone" />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>{selectedDebtor.name}</Typography>
                </Stack>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Invoice Details: ({new Date().toLocaleDateString()})
                </Typography>

                <Stack spacing={2} sx={{ mb: 4 }}>
                  {hasCharges ? (
                    selectedDebtor.recentCharges!.map((charge, i) => (
                      <Stack key={i} direction="row" justifyContent="space-between">
                        <Typography variant="body1">Item: {charge.description}</Typography>
                        <Typography variant="body1">- ${charge.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                      </Stack>
                    ))
                  ) : (
                    selectedDebtor.balance >= 0 ? (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600 }}>Available Credit Balance</Typography>
                        <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600 }}>+${selectedDebtor.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                      </Stack>
                    ) : (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body1">Item: Previous Balance</Typography>
                        <Typography variant="body1">- ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                      </Stack>
                    )
                  )}
                </Stack>

                <Box sx={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', py: 2, mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>Items Total:</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>${chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                  </Stack>

                  {previousDebt > 0 && !(!hasCharges) && (
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="error.main">Previous Unpaid Debt:</Typography>
                      <Typography variant="body2" color="error.main">+${previousDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                    </Stack>
                  )}

                  {balanceApplied > 0 && (
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="success.main">Credit Applied:</Typography>
                      <Typography variant="body2" color="success.main">-${balanceApplied.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                    </Stack>
                  )}
                </Box>

                <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={800}>Total Due:</Typography>
                  <Typography variant="h6" fontWeight={800}>${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
                </Stack>

                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: 2, mt: 'auto' }}
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  Pay
                </Button>
              </Box>
            </Box>
          )
        })() : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
            <Typography variant="h6" color="text.disabled">Select a patient from the queue or search to begin.</Typography>
          </Box>
        )}
      </Box>

      {/* Action Buttons Section (Footer) */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, pt: 1, pb: 2 }}>
        <Stack alignItems="center" spacing={1} sx={{ cursor: 'pointer', color: '#fff', '&:hover': { opacity: 0.8 } }} onClick={onOpenTransactionsHistory}>
          <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }}>
            <FirstAidKit size={24} weight="duotone" />
          </Box>
          <Typography variant="caption">Transactions History</Typography>
        </Stack>

        <Stack alignItems="center" spacing={1} sx={{ cursor: 'pointer', color: '#fff', '&:hover': { opacity: 0.8 } }} onClick={onOpenManualTransaction}>
          <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }}>
            <Wallet size={24} weight="duotone" />
          </Box>
          <Typography variant="caption">Manual Transaction / Adjustment</Typography>
        </Stack>

        <Stack alignItems="center" spacing={1} sx={{ cursor: 'pointer', color: '#fff', '&:hover': { opacity: 0.8 } }} onClick={onOpenCloseSession}>
          <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }}>
            <Storefront size={24} weight="duotone" />
          </Box>
          <Typography variant="caption">Register closing</Typography>
        </Stack>
      </Box>

      {/* Checkout Dialog */}
      {selectedDebtor && (
        <POSCheckoutDialog
          open={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={async (data: CheckoutRequest) => {
            try {
              const res = await apiClient.post(`/transactions/checkout/${selectedDebtor.id}`, data);

              const totalPayment = data.cash + data.credit + data.debit + data.discount;
              const hasCharges = selectedDebtor.recentCharges && selectedDebtor.recentCharges.length > 0;
              const chargesTotal = hasCharges ? selectedDebtor.recentCharges!.reduce((sum, c) => sum + c.cost, 0) : 0;
              
              const discount = data.discount || 0;
              const netCharge = Math.max(0, chargesTotal - discount);
              const cashCreditDebit = data.cash + data.credit + data.debit;
              
              const currentBalance = selectedDebtor.balance;
              const balanceBeforeCharge = currentBalance;
              const availableCredit = Math.max(0, balanceBeforeCharge);
              
              const balancePay = Math.min(availableCredit, Math.max(0, netCharge - cashCreditDebit));
              const backendFinalBalance = currentBalance - chargesTotal + totalPayment;

              try {
                const { generateTicketExcel } = await import('@/lib/generate-ticket');
                await generateTicketExcel({
                  transId: res.data.transactionId || 'N/A',
                  patientId: selectedDebtor.id,
                  patientName: selectedDebtor.name,
                  appointmentDate: new Date().toLocaleDateString(),
                  services: selectedDebtor.recentCharges?.map(c => c.description).join(', ') || 'N/A',
                  price: chargesTotal,
                  subtotal: chargesTotal,
                  discount: discount,
                  total: netCharge,
                  balancePay: balancePay,
                  cashPay: data.cash,
                  creditPay: data.credit,
                  debitPay: data.debit,
                  patientFinalBalance: backendFinalBalance
                });
              } catch (excelErr) {
                console.error('Failed to generate ticket excel', excelErr);
              }

              setIsCheckoutOpen(false);
              if (onCheckoutSuccess) onCheckoutSuccess();
            } catch (err) {
              console.error('Checkout failed', err);
              alert('Failed to process payment');
            }
          }}
          patientName={selectedDebtor.name}
          totalDebt={totalDebt}
          recentCharges={selectedDebtor.recentCharges || []}
        />
      )}
    </Box>
  );
}
