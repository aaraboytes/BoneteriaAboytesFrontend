'use client';

import * as React from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  TextField,
  Stack
} from '@mui/material';
import apiClient from '@/lib/api-client';

interface CashTransaction {
  time: string;
  transactionId: string;
  patient: string;
  description: string;
  typeContext: string;
  cost: number;
  initialBalance: number;
  paidWithBalance: number;
  cashPayment: number;
  creditPayment: number;
  debitPayment: number;
  finalBalance: number;
  debt: number;
  revenue: number;
}

export function DailyCashClosingReport(): React.JSX.Element {
  const [transactions, setTransactions] = React.useState<CashTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [date, setDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/transactions/daily-closing?date=${date}`);
        setTransactions(res.data || []);
      } catch (err) {
        console.error('Failed to fetch closing report', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [date]);

  const formatMoney = (val: number) => {
    if (val === undefined || val === null) return '';
    const formatted = Math.abs(val).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    return val < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Cash Ledger</Typography>
          <TextField
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Stack>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table sx={{ minWidth: 1200, '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Init. Balance</TableCell>
                <TableCell align="right">Paid /w Bal</TableCell>
                <TableCell align="right">Cash</TableCell>
                <TableCell align="right">Credit</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Fin. Balance</TableCell>
                <TableCell align="right">Debt</TableCell>
                <TableCell align="right">Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t, idx) => {
                const isClosingRow = t.description === "CASH CLOSING";
                return (
                  <TableRow 
                    key={idx} 
                    hover 
                    sx={isClosingRow ? { 
                      '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider', bgcolor: 'background.default' } 
                    } : {}}
                  >
                    <TableCell>{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                    <TableCell>{t.transactionId}</TableCell>
                    <TableCell>{t.patient}</TableCell>
                    <TableCell>
                      {t.description}
                      {t.typeContext && !isClosingRow && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {t.typeContext}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{!isClosingRow ? formatMoney(t.cost) : ''}</TableCell>
                    <TableCell align="right">{formatMoney(t.initialBalance)}</TableCell>
                    <TableCell align="right">{formatMoney(t.paidWithBalance)}</TableCell>
                    <TableCell align="right">{formatMoney(t.cashPayment)}</TableCell>
                    <TableCell align="right">{formatMoney(t.creditPayment)}</TableCell>
                    <TableCell align="right">{formatMoney(t.debitPayment)}</TableCell>
                    <TableCell align="right">{formatMoney(t.finalBalance)}</TableCell>
                    <TableCell align="right">{formatMoney(t.debt)}</TableCell>
                    <TableCell align="right">{formatMoney(t.revenue)}</TableCell>
                  </TableRow>
                );
              })}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No financial movements recorded for this date.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}
