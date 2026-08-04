'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import { PlusCircle as ControlPointIcon } from '@phosphor-icons/react/dist/ssr/PlusCircle';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Printer as PrintIcon } from '@phosphor-icons/react/dist/ssr/Printer';
import IconButton from '@mui/material/IconButton';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Wallet as WalletIcon } from '@phosphor-icons/react/dist/ssr/Wallet';

interface PaymentMethod {
    id: string;
    method: 'Cash' | 'Card' | 'Transfer';
    amount: number;
}

interface CheckoutPanelProps {
    appointment: any;
    subtotal: number;
    discountAmount: number;
    payments: PaymentMethod[];
    setPayments: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
    onFinalize: () => void;
    isSuccess: boolean;
    patientCredit: number;
    creditUsed: number;
    setCreditUsed: React.Dispatch<React.SetStateAction<number>>;
    onKeepPending: () => void;
}

export function CheckoutPanel({
    appointment,
    subtotal,
    discountAmount,
    payments,
    setPayments,
    onFinalize,
    isSuccess,
    patientCredit,
    creditUsed,
    setCreditUsed,
    onKeepPending
}: CheckoutPanelProps): React.JSX.Element {

    if (!appointment) {
        return <Card sx={{ height: '100%', bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider' }} />;
    }

    const taxRate = 0; // 0% tax for medical usually, but can be adjustable
    const totalPreInsurance = subtotal - discountAmount + taxRate;
    const patientResponsibility = Math.max(0, totalPreInsurance);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalApplied = totalPaid + creditUsed;
    const isOverpaid = totalApplied > patientResponsibility;
    const balanceDue = Math.max(0, patientResponsibility - totalApplied);
    const surplusToBalance = isOverpaid ? (totalApplied - patientResponsibility) : 0;

    const handleAddPayment = () => {
        setPayments([...payments, { id: Date.now().toString(), method: 'Cash', amount: 0 }]);
    };

    const updatePaymentMethod = (id: string, method: 'Cash' | 'Card' | 'Transfer') => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, method } : p));
    };

    const updatePaymentAmount = (id: string, amount: number) => {
        setPayments(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
    };

    const removePayment = (id: string) => setPayments(prev => prev.filter(p => p.id !== id));

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', textAlign: 'center' }}>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Grand Total</Typography>
                <Typography variant="h3" fontWeight={700}>${totalPreInsurance.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                <Stack spacing={3}>
                    <Divider />

                    {/* Patient Credit / Wallet */}
                    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: patientCredit > 0 ? 'success.50' : 'grey.50', border: '1px solid', borderColor: patientCredit > 0 ? 'success.100' : 'divider' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: patientCredit > 0 ? 'success.100' : 'grey.200', color: patientCredit > 0 ? 'success.main' : 'text.secondary', display: 'flex' }}>
                                    <WalletIcon size={20} weight="fill" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Available Credit</Typography>
                                    <Typography variant="h6" color={patientCredit > 0 ? 'success.main' : 'text.primary'} fontWeight={700}>
                                        ${patientCredit.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Stack>
                            {patientCredit > 0 && (
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Use for Sale"
                                    value={creditUsed}
                                    onChange={(e) => setCreditUsed(Math.max(0, Math.min(patientCredit, patientResponsibility, Number(e.target.value))))}
                                    inputProps={{ max: Math.min(patientCredit, patientResponsibility) }}
                                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                    sx={{ width: 130, bgcolor: 'background.paper' }}
                                />
                            )}
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Split Payments */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle2" color="text.secondary">Payments</Typography>
                            <Button variant="outlined" size="small" startIcon={<ControlPointIcon />} onClick={handleAddPayment}>
                                Add Method
                            </Button>
                        </Stack>

                        <Stack spacing={2}>
                            {payments.map(payment => (
                                <Stack key={payment.id} direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        select
                                        size="small"
                                        value={payment.method}
                                        onChange={(e) => updatePaymentMethod(payment.id, e.target.value as any)}
                                        sx={{ width: 100 }}
                                    >
                                        <MenuItem value="Cash">Cash</MenuItem>
                                        <MenuItem value="Card">Card</MenuItem>
                                        <MenuItem value="Transfer">Transfer</MenuItem>
                                    </TextField>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={payment.amount || ''}
                                        onChange={(e) => updatePaymentAmount(payment.id, Number(e.target.value))}
                                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                        sx={{ flexGrow: 1 }}
                                        placeholder="0.00"
                                    />
                                    <IconButton size="small" color="error" onClick={() => removePayment(payment.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            {/* Footer Action */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                {creditUsed > 0 && (
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Applied Patient Credit:</Typography>
                        <Typography variant="body2" color="primary.main" fontWeight={600}>-${creditUsed.toFixed(2)}</Typography>
                    </Stack>
                )}
                <Stack direction="row" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2">
                        {isOverpaid ? 'Surplus to Balance (Credit):' : 'Balance Due:'}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700} color={isOverpaid ? 'primary.main' : (balanceDue > 0 ? 'error.main' : 'success.main')}>
                        ${isOverpaid ? surplusToBalance.toFixed(2) : balanceDue.toFixed(2)}
                    </Typography>
                </Stack>
                
                <Stack spacing={2}>
                    {balanceDue > 0 && (
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            disabled={isSuccess}
                            onClick={onKeepPending}
                            sx={{ height: 48 }}
                        >
                            Keep Pending (Add to Balance)
                        </Button>
                    )}

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    color={isSuccess ? 'success' : 'primary'}
                    disabled={(balanceDue > 0 && totalPreInsurance > 0) || (payments.length === 0 && totalPreInsurance > 0 && creditUsed < patientResponsibility) || isSuccess}
                    onClick={onFinalize}
                    startIcon={isSuccess ? <CheckCircleIcon /> : <PrintIcon />}
                    sx={{
                        height: 56,
                        transition: 'all 0.3s ease',
                        ...(isSuccess && {
                            transform: 'scale(1.02)',
                            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.4)'
                        })
                    }}
                >
                    {isSuccess ? 'Transaction Complete!' : 'Finalize & Print'}
                </Button>
            </Stack>
            </Box>
        </Card>
    );
}
