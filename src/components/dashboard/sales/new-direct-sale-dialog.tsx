'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Autocomplete,
    TextField,
    CircularProgress,
    Stack
} from '@mui/material';
import apiClient from '@/lib/api-client';

interface Patient {
    id: number;
    firstName: string;
    lastName: string;
}

interface NewDirectSaleDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewDirectSaleDialog({ open, onClose, onSuccess }: NewDirectSaleDialogProps): React.JSX.Element {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [patients, setPatients] = React.useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        let active = true;
        if (searchTerm === '') {
            setPatients([]);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/Patients?query=${encodeURIComponent(searchTerm)}`);
                if (active) setPatients(res.data.items || []);
            } catch (err) {
                console.error('Failed to search patients', err);
            } finally {
                if (active) setLoading(false);
            }
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchTerm, open]);

    const handleSubmit = async () => {
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            console.log('Creating sale for patient:', selectedPatient.id);
            const response = await apiClient.post('/Sales', {
                patientId: selectedPatient.id,
                totalAmount: 0,
                status: 'pending'
            });
            console.log('Sale created successfully:', response.data);
            onSuccess();
        } catch (err: any) {
            console.error('Failed to create sale', err);
            const errorMessage = err.response?.data 
                ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
                : err.message;
            alert(`Error creating sale: ${errorMessage}\nStatus: ${err.response?.status}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>New Direct Sale</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Autocomplete
                        options={patients}
                        getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                        filterOptions={(x) => x}
                        onInputChange={(_, value) => setSearchTerm(value)}
                        onChange={(_, value) => setSelectedPatient(value)}
                        loading={loading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Search Patient"
                                placeholder="Name..."
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <React.Fragment>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={!selectedPatient || submitting}
                >
                    {submitting ? 'Creating...' : 'Create Sale'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
