'use client';

import * as React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress
} from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import apiClient from '@/lib/api-client';

export interface InterconsultationNotesDialogProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientId: string;
    initialNotes: string;
    onSaved?: () => void;
}

export function InterconsultationNotesDialog({ open, onClose, appointmentId, patientId, initialNotes, onSaved }: InterconsultationNotesDialogProps): React.JSX.Element {
    const [notes, setNotes] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setNotes(initialNotes);
        } else {
            setNotes('');
        }
    }, [open, initialNotes]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.patch(`/Appointments/${appointmentId}/notes`, {
                patientId: Number(patientId),
                notes
            });
            if (onSaved) onSaved();
            onClose();
        } catch (error: any) {
            console.error('Failed to update interconsultation notes:', error);
            alert(error.response?.data || 'Failed to update interconsultation notes.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>View and Edit Interconsultation Notes</DialogTitle>
            <DialogContent dividers>
                <TextField
                    label="Interconsultation Notes"
                    multiline
                    rows={8}
                    fullWidth
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter or edit interconsultation notes..."
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />} 
                    onClick={handleSave}
                    disabled={saving}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}
