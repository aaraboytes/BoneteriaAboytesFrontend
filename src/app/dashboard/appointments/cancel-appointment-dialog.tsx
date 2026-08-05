'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';

export interface CancelAppointmentDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirmCancel: (reason: string, comment: string) => void;
    onReschedule: (reason: string, comment: string) => void;
    isRehab?: boolean;
}

const CANCELLATION_REASONS = [
    'Patient sick',
    'Patient had an emergency',
    'Patient forgot',
    'Transportation issues',
    'Scheduling conflict',
    'Weather conditions',
    'Financial issues',
    'Found another provider',
    'Staff member sick/unavailable',
    'Equipment breakdown',
    'Store holiday/closure',
    'Staff error',
    'Insurance/Authorization issues',
    'No longer needed',
    'Other'
];

export function CancelAppointmentDialog({ open, onClose, onConfirmCancel, onReschedule, isRehab }: CancelAppointmentDialogProps): React.JSX.Element {
    const [reason, setReason] = React.useState('');
    const [comment, setComment] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setReason('');
            setComment('');
        }
    }, [open]);

    const handleConfirmCancel = () => {
        onConfirmCancel(reason, comment);
    };

    const handleReschedule = () => {
        onReschedule(reason, comment);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    {isRehab ? (
                        <Box sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', p: 2, borderRadius: 1 }}>
                            <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>
                                Rehabilitation Session Cancellation
                            </Typography>
                            <Typography variant="body2">
                                Would you like to reschedule for a specific date or shift the remaining sessions to the next available slot?
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Please provide a reason for canceling this appointment. This helps us track issues and improve our services.
                        </Typography>
                    )}

                    <FormControl fullWidth>
                        <InputLabel id="cancel-reason-label">Reason for cancellation</InputLabel>
                        <Select
                            labelId="cancel-reason-label"
                            value={reason}
                            label="Reason for cancellation"
                            onChange={(e) => setReason(e.target.value)}
                        >
                            {CANCELLATION_REASONS.map((r) => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Additional commentaries (Optional)"
                        placeholder="Enter any additional details if needed..."
                        multiline
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
                <Button onClick={handleReschedule} disabled={!reason} variant="outlined" color="primary">
                    {isRehab ? "Reschedule for specific date" : "Cancel & Reschedule"}
                </Button>
                <Button onClick={handleConfirmCancel} disabled={!reason} variant="contained" color="error">
                    {isRehab ? "Shift to next slot" : "Confirm Cancel"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
