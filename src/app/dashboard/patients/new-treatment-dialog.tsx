import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import apiClient from '@/lib/api-client';

interface NewTreatmentDialogProps {
    open: boolean;
    patientId: number;
    nextNumber: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewTreatmentDialog({ open, patientId, nextNumber, onClose, onSuccess }: NewTreatmentDialogProps): React.JSX.Element {
    const [treatmentText, setTreatmentText] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setTreatmentText('');
        }
    }, [open]);

    const handleSave = async () => {
        if (!treatmentText.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/MedicalRecords/treatments`, {
                patientId,
                number: nextNumber,
                treatmentText
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to save treatment', error);
            alert('Failed to save treatment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Treatment</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField
                        label="Treatment Number"
                        value={nextNumber}
                        disabled
                        fullWidth
                    />
                    <TextField
                        label="Treatment Details"
                        value={treatmentText}
                        onChange={(e) => setTreatmentText(e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={submitting || !treatmentText.trim()}>
                    Save Treatment
                </Button>
            </DialogActions>
        </Dialog>
    );
}
