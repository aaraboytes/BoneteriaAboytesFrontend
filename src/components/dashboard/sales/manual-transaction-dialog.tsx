'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import apiClient from '@/lib/api-client';

interface Patient {
    id: number;
    firstName: string;
    lastName: string;
}

interface ManualTransactionDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialPatient?: Patient | null;
}

export function ManualTransactionDialog({ open, onClose, onSuccess, initialPatient }: ManualTransactionDialogProps): React.JSX.Element {
    const [type, setType] = React.useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = React.useState<number>(0);
    const [discount, setDiscount] = React.useState<number>(0);
    const [reason, setReason] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    // Patient Search State
    const [searchTerm, setSearchTerm] = React.useState('');
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [loadingPatients, setLoadingPatients] = React.useState(false);
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

    React.useEffect(() => {
        if (open) {
            setType('INCOME');
            setAmount(0);
            setDiscount(0);
            setReason('');
            setSelectedPatient(initialPatient || null);
            setSearchTerm('');
            setPatients([]);
        }
    }, [open, initialPatient]);

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

    const handleSubmit = async () => {
        if (amount <= 0) {
            alert('Amount must be greater than 0');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/transactions/manual', {
                patientId: selectedPatient?.id,
                type,
                amount,
                discount,
                description: reason
            });
            onSuccess();
        } catch (error: any) {
            console.error('Failed to register manual transaction:', error);
            alert(`Failed to register transaction: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Register Manual Transaction</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        select
                        fullWidth
                        label="Transaction Type"
                        value={type}
                        onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
                    >
                        <MenuItem value="INCOME">Income (Ingreso / Abono / Top-up)</MenuItem>
                        <MenuItem value="EXPENSE">Expense (Retiro / Supplier PMT / Refund)</MenuItem>
                    </TextField>

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
                                label="Patient (Optional)"
                                placeholder="Search patient..."
                                variant="outlined"
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

                    <Stack direction="row" spacing={2}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Amount"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                        />
                        
                        <TextField
                            fullWidth
                            type="number"
                            label="Discount (Optional)"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                        />
                    </Stack>

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Description / Concept"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Abono, Pago de proveedor"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || amount <= 0}>
                    {loading ? 'Saving...' : 'Register Transaction'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
