'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { 
    Receipt, 
    Money, 
    CreditCard, 
    Bank, 
    WarningCircle, 
    ChartLineUp, 
    Vault, 
    PencilSimple, 
    Export,
    CaretDown,
    CaretUp
} from '@phosphor-icons/react/dist/ssr';
import apiClient from '@/lib/api-client';
import { generateDailyReportExcel, DailyReportData } from '@/lib/generate-daily-report';

// ---------------------------------------------------------
// REUSABLE MOBILE CARD COMPONENTS FOR LEDGER DIALOG
// ---------------------------------------------------------

function MobileLedgerCard({ row, onEdit, isSummary }: { row: any; onEdit: () => void; isSummary: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const timeStr = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <Card 
      sx={{ 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        boxShadow: 'none',
        bgcolor: isSummary ? '#f1f5f9' : '#fff',
        borderLeft: isSummary ? '4px solid #64748b' : '1px solid #e2e8f0'
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ maxWidth: '65%' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                {timeStr} | ID: {row.transactionId}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {row.patient || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                Revenue
              </Typography>
              <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ fontSize: '0.85rem' }}>
                ${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.8rem', fontWeight: isSummary ? 700 : 400 }}>
            {row.description}
          </Typography>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Grid container spacing={1}>
                {[
                  { label: 'Cost', value: row.cost, color: 'text.primary' },
                  { label: 'Discount', value: row.discount, color: row.discount > 0 ? 'error.main' : 'text.primary' },
                  { label: 'Init Bal', value: row.initialBalance, color: row.initialBalance < 0 ? 'error.main' : 'text.primary' },
                  { label: 'Paid (Bal)', value: row.paidWithBalance, color: 'text.primary' },
                  { label: 'Cash Paid', value: row.cashPayment, color: 'text.primary' },
                  { label: 'Credit Paid', value: row.creditPayment, color: 'text.primary' },
                  { label: 'Debit Paid', value: row.debitPayment, color: 'text.primary' },
                  { label: 'Final Bal', value: row.finalBalance, color: row.finalBalance < 0 ? 'error.main' : 'text.primary' },
                  { label: 'Debt', value: row.debt, color: row.debt > 0 ? 'error.main' : 'text.primary' }
                ].map((item, i) => (
                  <Grid size={{ xs: 4 }} key={i}>
                    <Box sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>{item.label}</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }} color={item.color}>
                        ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Collapse>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button 
              size="small" 
              variant="text" 
              color="inherit"
              onClick={() => setExpanded(!expanded)}
              startIcon={expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
              sx={{ fontWeight: 600, color: '#64748b', textTransform: 'none', fontSize: '0.75rem', p: 0 }}
            >
              {expanded ? 'Hide details' : 'Show details'}
            </Button>
            {!isSummary && row.revenue > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={onEdit}
                startIcon={<PencilSimple size={14} />}
                sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem', py: 0.25 }}
              >
                Edit
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MobileDebtorCard({ row }: { row: any }) {
  const timeStr = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ maxWidth: '60%' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
              {timeStr}
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {row.patient}
            </Typography>
          </Box>
          <Stack spacing={0.5} alignItems="flex-end">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Today's Debt
            </Typography>
            <Typography variant="body2" fontWeight={700} color="error.main" sx={{ fontSize: '0.85rem' }}>
              ${row.todaysDebt?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              Final: ${row.finalBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MobileDiscountCard({ row }: { row: any }) {
  const timeStr = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initialAmount = Math.abs(row.initialBalance);
  const finalAmount = initialAmount - row.discount;
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ maxWidth: '60%' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                {timeStr}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="#0f172a" sx={{ fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {row.patient}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                Discount
              </Typography>
              <Typography variant="body2" fontWeight={700} color="error.main" sx={{ fontSize: '0.85rem' }}>
                -${row.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ borderStyle: 'dashed' }} />
          <Grid container spacing={1}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>Initial Amount</Typography>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>${initialAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>Final Amount</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.75rem' }}>${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Typography>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface DailyHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId?: number;
}

export function DailyHistoryDialog({ open, onClose, sessionId }: DailyHistoryDialogProps): React.JSX.Element {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [transactions, setTransactions] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [editTransaction, setEditTransaction] = React.useState<any>(null);
    const [editCash, setEditCash] = React.useState(0);
    const [editCredit, setEditCredit] = React.useState(0);
    const [editDebit, setEditDebit] = React.useState(0);
    const [savingPayment, setSavingPayment] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            fetchSummary();
        } else {
            setTransactions([]);
        }
    }, [open, sessionId]);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const url = sessionId 
                ? `/Analytics/register-closings/${sessionId}/transactions` 
                : '/transactions/daily-closing';
            const response = await apiClient.get(url);
            setTransactions(response.data || []);
        } catch (error) {
            console.error('Failed to fetch daily closing history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!summaryRow) return;

        // Collect all discounts
        const discounts = dataRows.filter((row: any) => row.discount > 0).map((row: any) => {
            const initialAmount = Math.abs(row.initialBalance);
            const finalAmount = initialAmount - row.discount;
            return {
                time: new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                patient: row.patient,
                initialAmount: `$${initialAmount.toFixed(2)}`,
                discountAmount: `$${row.discount.toFixed(2)}`,
                finalAmount: `$${finalAmount.toFixed(2)}`
            };
        });

        // Collect debtors
        const mappedDebtors = todayDebtors.map((row: any) => ({
            time: new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            patient: row.patient,
            todaysDebt: `$${row.todaysDebt.toFixed(2)}`,
            finalBalance: `$${row.finalBalance.toFixed(2)}`
        }));

        // Collect transactions
        const mappedTransactions = dataRows.map((row: any) => ({
            time: new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            transactionID: row.transactionId,
            patient: row.patient,
            description: row.description,
            cost: row.cost > 0 ? `$${row.cost.toFixed(2)}` : '',
            discount: row.discount > 0 ? `$${row.discount.toFixed(2)}` : '',
            initialBalance: `$${row.initialBalance.toFixed(2)}`,
            paidBalance: row.paidWithBalance > 0 ? `$${row.paidWithBalance.toFixed(2)}` : '',
            cash: row.cashPayment > 0 ? `$${row.cashPayment.toFixed(2)}` : '',
            credit: row.creditPayment > 0 ? `$${row.creditPayment.toFixed(2)}` : '',
            debit: row.debitPayment > 0 ? `$${row.debitPayment.toFixed(2)}` : '',
            finalBalance: `$${row.finalBalance.toFixed(2)}`,
            debt: row.debt > 0 ? `$${row.debt.toFixed(2)}` : '',
            revenue: row.revenue > 0 ? `$${row.revenue.toFixed(2)}` : ''
        }));

        const reportData: DailyReportData = {
            date: new Date().toLocaleDateString(),
            totalTransactions: dataRows.length,
            cashRevenue: summaryRow.cashPayment,
            creditRevenue: summaryRow.creditPayment,
            debitRevenue: summaryRow.debitPayment,
            dayDiscounts: summaryRow.discount,
            netRevenue: summaryRow.revenue,
            debtGenerated: summaryRow.debt,
            transactions: mappedTransactions,
            debtors: mappedDebtors,
            discounts: discounts
        };

        try {
            await generateDailyReportExcel(reportData);
        } catch (error) {
            console.error("Export error", error);
            alert("Failed to export Excel file");
        }
    };

    const handleOpenEdit = (row: any) => {
        setEditTransaction(row);
        setEditCash(row.cashPayment);
        setEditCredit(row.creditPayment);
        setEditDebit(row.debitPayment);
    };

    const handleSaveEdit = async () => {
        if (!editTransaction) return;
        const totalOrig = editTransaction.cashPayment + editTransaction.creditPayment + editTransaction.debitPayment;
        const totalNew = editCash + editCredit + editDebit;
        if (Math.abs(totalOrig - totalNew) > 0.01) {
            alert(`The new payment breakdown total ($${totalNew.toFixed(2)}) must exactly match the original payment total ($${totalOrig.toFixed(2)}).`);
            return;
        }

        setSavingPayment(true);
        try {
            const id = parseInt(editTransaction.transactionId.replace('#', ''));
            await apiClient.put(`/transactions/${id}/payment-breakdown`, {
                cash: editCash,
                credit: editCredit,
                debit: editDebit
            });
            setEditTransaction(null);
            fetchSummary(); // Refresh the list
        } catch (err: any) {
            alert('Failed to update: ' + (err.response?.data?.message || err.message));
        } finally {
            setSavingPayment(false);
        }
    };

    const summaryRow = transactions.length > 0 && transactions[transactions.length - 1].description === 'CASH CLOSING'
        ? transactions[transactions.length - 1]
        : null;

    const dataRows = summaryRow ? transactions.slice(0, -1) : transactions;

    // Get the final state of each patient today to find active debtors
    const todayDebtors = Object.values(
        dataRows.reduce((acc: any, row: any) => {
            if (row.patient) {
                if (!acc[row.patient]) {
                    // First transaction of the day for this patient
                    acc[row.patient] = { ...row, startOfDayBalance: row.initialBalance };
                } else {
                    // Subsequent transactions
                    acc[row.patient] = {
                        ...row,
                        startOfDayBalance: acc[row.patient].startOfDayBalance
                    };
                }
            }
            return acc;
        }, {})
    ).map((row: any) => {
        const startDebt = Math.min(0, row.startOfDayBalance);
        const finalDebt = Math.min(0, row.finalBalance);

        row.todaysDebt = startDebt - finalDebt;

        return row;
    }).filter((row: any) => row.finalBalance < 0) as any[];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, px: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 } }}>Transactions History (Today)</DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Stack spacing={4}>
                        {/* Date and Title*/}
                        <Typography variant="h6" color="text.secondary" sx={{ mt: -1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>

                        {/* KPI Summary Cards */}
                        <Grid container spacing={isMobile ? 1.5 : 1}>
                            {[
                                { title: 'Total Transactions', value: dataRows.length, icon: Receipt, color: '#0ea5e9', bg: '#e0f2fe' },
                                { title: 'Cash Revenue', value: `$${(summaryRow?.cashPayment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Money, color: '#10b981', bg: '#d1fae5' },
                                { title: 'Credit Revenue', value: `$${(summaryRow?.creditPayment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: '#3b82f6', bg: '#dbeafe' },
                                { title: 'Debit Revenue', value: `$${(summaryRow?.debitPayment || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Bank, color: '#f59e0b', bg: '#fef3c7' },
                                { title: 'Debt Generated', value: `$${(summaryRow?.debt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: WarningCircle, color: '#ef4444', bg: '#fee2e2' },
                                { title: 'Net Revenue', value: `$${(summaryRow?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: ChartLineUp, color: '#64748b', bg: '#f1f5f9' },
                                { title: 'Discounts', value: `$${(summaryRow?.discount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Money, color: '#ef4444', bg: '#fee2e2' },
                                { title: 'Total Earnings (Rev-Debt)', value: `$${((summaryRow?.revenue || 0) - (summaryRow?.debt || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Vault, color: '#8b5cf6', bg: '#ede9fe' },
                            ].map((kpi, idx) => (
                                <Grid key={idx} size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
                                    <Card sx={{
                                        borderRadius: 3,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        height: '100%'
                                    }}>
                                        <CardContent sx={{ p: { xs: '16px !important', sm: '24px !important' } }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                                                <Box>
                                                    <Typography variant="overline" color="text.secondary" fontWeight={700} lineHeight={1.2} display="block" sx={{ mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                                        {kpi.title}
                                                    </Typography>
                                                    <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                                                        {kpi.value}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: kpi.bg, color: kpi.color, display: { xs: 'none', sm: 'flex' } }}>
                                                    <kpi.icon weight="duotone" size={24} />
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Detailed Chronological Ledger Table */}
                        <h2 style={{ marginTop: '2rem' }}>Chronological Ledger</h2>
                        {isMobile ? (
                            <Stack spacing={2}>
                                {transactions.map((row, idx) => {
                                    const isSummary = row.description === 'CASH CLOSING';
                                    return (
                                        <MobileLedgerCard
                                            key={idx}
                                            row={row}
                                            isSummary={isSummary}
                                            onEdit={() => handleOpenEdit(row)}
                                        />
                                    );
                                })}
                                {transactions.length === 0 && (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography color="text.secondary">No transactions recorded yet.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        ) : (
                            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                                        <TableRow>
                                            <TableCell>Time</TableCell>
                                            <TableCell>ID</TableCell>
                                            <TableCell>Patient</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Cost</TableCell>
                                            <TableCell align="right">Discount</TableCell>
                                            <TableCell align="right">Init Bal</TableCell>
                                            <TableCell align="right">Paid (Bal)</TableCell>
                                            <TableCell align="right">Cash</TableCell>
                                            <TableCell align="right">Credit</TableCell>
                                            <TableCell align="right">Debit</TableCell>
                                            <TableCell align="right">Final Bal</TableCell>
                                            <TableCell align="right">Debt</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transactions.map((row, idx) => {
                                            const isSummary = row.description === 'CASH CLOSING';
                                            return (
                                                <TableRow key={idx} sx={{ bgcolor: isSummary ? 'grey.200' : 'inherit' }}>
                                                    <TableCell>{new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell>{row.transactionId}</TableCell>
                                                    <TableCell>{row.patient}</TableCell>
                                                    <TableCell sx={{ fontWeight: isSummary ? 700 : 400 }}>{row.description}</TableCell>
                                                    <TableCell align="right">${row.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell align="right" sx={{ color: row.discount > 0 ? 'error.main' : 'inherit' }}>
                                                        ${row.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: row.initialBalance < 0 ? 'error.main' : 'inherit' }}>
                                                        ${row.initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="right">${row.paidWithBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell align="right">${row.cashPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell align="right">${row.creditPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell align="right">${row.debitPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell align="right" sx={{ color: row.finalBalance < 0 ? 'error.main' : 'inherit' }}>
                                                        ${row.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: row.debt > 0 ? 'error.main' : 'inherit' }}>
                                                        ${row.debt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                        ${row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {!isSummary && row.revenue > 0 && (
                                                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
                                                                <PencilSimple size={16} />
                                                            </IconButton>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {transactions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={15} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">No transactions recorded yet.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}

                        {/*Today debtors*/}
                        <h2>Today's Debtors</h2>
                        {isMobile ? (
                            <Stack spacing={2}>
                                {todayDebtors.map((row, idx) => (
                                    <MobileDebtorCard key={idx} row={row} />
                                ))}
                                {todayDebtors.length === 0 && (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography color="text.secondary">No remaining debtors from today's transactions.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        ) : (
                            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                                        <TableRow>
                                            <TableCell>Time</TableCell>
                                            <TableCell>Patient</TableCell>
                                            <TableCell align="right">Today's Debt</TableCell>
                                            <TableCell align="right">Final Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {todayDebtors.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                <TableCell>{row.patient}</TableCell>
                                                <TableCell align="right" sx={{ color: row.todaysDebt > 0 ? 'error.main' : 'inherit' }}>
                                                    ${row.todaysDebt?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: row.finalBalance < 0 ? 'error.main' : 'inherit' }}>
                                                    ${row.finalBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {todayDebtors.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">No remaining debtors from today's transactions.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}

                        {/*Today´s discounts*/}
                        <h2>Today's discounts</h2>
                        {isMobile ? (
                            <Stack spacing={2}>
                                {dataRows.filter((row: any) => row.discount > 0).map((row: any, idx: number) => (
                                    <MobileDiscountCard key={idx} row={row} />
                                ))}
                                {dataRows.filter((row: any) => row.discount > 0).length === 0 && (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography color="text.secondary">No discounts recorded today.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        ) : (
                            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                                <Table size='small'>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Time</TableCell>
                                            <TableCell>Patient</TableCell>
                                            <TableCell>Initial Amount</TableCell>
                                            <TableCell>Discount Amount</TableCell>
                                            <TableCell>Final Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dataRows.filter((row: any) => row.discount > 0).map((row: any, idx: number) => {
                                            const initialAmount = Math.abs(row.initialBalance);
                                            const finalAmount = initialAmount - row.discount;
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell>{new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell>{row.patient}</TableCell>
                                                    <TableCell>${initialAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell sx={{ color: 'error.main' }}>${row.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {dataRows.filter((row: any) => row.discount > 0).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                                    <Typography color="text.secondary">No discounts recorded today.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Close</Button>
                <Button variant="outlined" disabled={loading || transactions.length === 0} onClick={handleExportExcel} startIcon={<Export />}>
                    Export
                </Button>
            </DialogActions>

            {/* Edit Payment Breakdown Dialog */}
            <Dialog open={Boolean(editTransaction)} onClose={() => setEditTransaction(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Payment Breakdown</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Reassign the amounts paid via cash, credit, or debit. The total must remain exactly ${editTransaction ? (editTransaction.cashPayment + editTransaction.creditPayment + editTransaction.debitPayment).toFixed(2) : '0.00'}.
                    </Typography>
                    <Stack spacing={3}>
                        <TextField
                            label="Cash Payment"
                            type="number"
                            fullWidth
                            value={editCash === 0 ? '' : editCash}
                            onChange={(e) => setEditCash(Number(e.target.value))}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                        />
                        <TextField
                            label="Credit Payment"
                            type="number"
                            fullWidth
                            value={editCredit === 0 ? '' : editCredit}
                            onChange={(e) => setEditCredit(Number(e.target.value))}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                        />
                        <TextField
                            label="Debit Payment"
                            type="number"
                            fullWidth
                            value={editDebit === 0 ? '' : editDebit}
                            onChange={(e) => setEditDebit(Number(e.target.value))}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTransaction(null)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={savingPayment}>Save</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
