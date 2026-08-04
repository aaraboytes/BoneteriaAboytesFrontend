import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import apiClient from '@/lib/api-client';

interface NewPrescriptionDialogProps {
    open: boolean;
    patientId: number;
    nextNumber: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewPrescriptionDialog({ open, patientId, nextNumber, onClose, onSuccess }: NewPrescriptionDialogProps): React.JSX.Element {
    const [prescriptionText, setPrescriptionText] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setPrescriptionText('');
        }
    }, [open]);

    const handleSave = async () => {
        if (!prescriptionText.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/MedicalRecords/prescriptions`, {
                patientId,
                number: nextNumber,
                prescriptionText
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to save prescription', error);
            alert('Failed to save prescription');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Prescription</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField
                        label="Prescription Number"
                        value={nextNumber}
                        disabled
                        fullWidth
                    />
                    <TextField
                        label="Prescription Details"
                        value={prescriptionText}
                        onChange={(e) => setPrescriptionText(e.target.value)}
                        multiline
                        rows={6}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={submitting || !prescriptionText.trim()}>
                    Save Prescription
                </Button>
            </DialogActions>
        </Dialog>
    );
}
